#!/usr/bin/env bash
set -euo pipefail

# === PRÉREQUIS ===
: "${BASE:?ex: http://localhost:4200/api/v1}"
: "${TOKEN_A:?ID token Firebase user A}"
: "${TOKEN_B:?ID token Firebase user B}"
: "${UID_A:?UID A}"
: "${UID_B:?UID B}"

jq >/dev/null 2>&1 || { echo "jq requis"; exit 1; }

say() { printf "\n\033[1;36m# %s\033[0m\n" "$*"; }
call() { # $1: TOKEN  $2: METHOD  $3: URL  $4: DATA(json or empty)
  if [ -n "${4-}" ]; then
    curl -sS -H "Authorization: Bearer $1" -H "Content-Type: application/json" -X "$2" -d "$4" "$3"
  else
    curl -sS -H "Authorization: Bearer $1" -X "$2" "$3"
  fi
}

say "1) Health"
call "$TOKEN_A" GET "$BASE/health" | jq .

say "2) Users: ensure profiles & availability"
call "$TOKEN_A" PUT "$BASE/users/$UID_A" '{"name":"Cabrel Ange","username":"cabrel","district":"Montreal"}' | jq '.user.username'
call "$TOKEN_B" PUT "$BASE/users/$UID_B" '{"name":"User B","username":"userb123","district":"Montreal"}' | jq '.user.username'
call "$TOKEN_A" GET "$BASE/users/availability?username=cabrel&email=userb@example.com" | jq .

say "3) Dogs CRUD (A)"
DOG_JSON=$(call "$TOKEN_A" POST "$BASE/dogs" '{"name":"Rex","breed":"Labrador","sex":"male","ageMonths":18,"weightKg":28,"bio":"Joueur","avatarURL":"https://i.pravatar.cc/200?u=rex","vaccinated":true,"sterilized":true}')
echo "$DOG_JSON" | jq .
DOG_ID=$(echo "$DOG_JSON" | jq -r '.dog._id')
call "$TOKEN_A" PUT "$BASE/dogs/$DOG_ID" '{"bio":"Très joueur","weightKg":29}' | jq '.dog | {weightKg,bio}'
call "$TOKEN_B" GET "$BASE/dogs/$DOG_ID" | jq . || true   # doit 403
call "$TOKEN_A" DELETE "$BASE/dogs/$DOG_ID" >/dev/null

say "4) Friends: request → incoming → accept"
FR_REQ_JSON=$(call "$TOKEN_A" POST "$BASE/friends/requests/$UID_B")
echo "$FR_REQ_JSON" | jq .
REQ_ID=$(echo "$FR_REQ_JSON" | jq -r '.request._id // empty')
if [ -z "$REQ_ID" ]; then
  REQ_ID=$(call "$TOKEN_B" GET "$BASE/friends/@me/requests/incoming" | jq -r '.requests[0]._id')
fi
call "$TOKEN_B" POST "$BASE/friends/requests/$REQ_ID/accept" | jq '.request.status'
call "$TOKEN_A" GET "$BASE/users/$UID_A" | jq '.user.friends'

say "5) Meetups: create by A → invite B → B accept"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
M_JSON=$(call "$TOKEN_A" POST "$BASE/meetups" "{\"title\":\"Promenade parc\",\"description\":\"test\",\"district\":\"VSMPE\",\"locationText\":\"Parc Jarry\",\"date\":\"$NOW\"}")
echo "$M_JSON" | jq .
MEETUP_ID=$(echo "$M_JSON" | jq -r '.meetup._id')
call "$TOKEN_A" POST "$BASE/meetups/$MEETUP_ID/invite/$UID_B" | jq '.meetup.invites'
INV_ID=$(call "$TOKEN_B" GET "$BASE/meetups/invitations" | jq -r --arg id "$MEETUP_ID" '[.invitations[]? | select(.meetupId==$id) | .invite._id] | first')
call "$TOKEN_B" POST "$BASE/meetups/invitations/$INV_ID/accept" | jq '.meetup.participants'

say "6) Notifications: list/unread → mark read → count=0"
call "$TOKEN_B" GET "$BASE/notifications?limit=10" | jq .
call "$TOKEN_B" GET "$BASE/notifications/unread/count" | jq .
# Marque tout comme lu
call "$TOKEN_B" POST "$BASE/notifications/read-all" '' | jq .
call "$TOKEN_B" GET "$BASE/notifications/unread/count" | jq .

say "7) Cleanup friendship (A supprime B)"
call "$TOKEN_A" DELETE "$BASE/friends/$UID_B" -d '' >/dev/null || true
echo '{"done":true}'
