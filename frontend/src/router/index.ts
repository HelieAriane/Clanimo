// src/router/index.ts
import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";
import TabsPage from "../views/TabsPage.vue";
import Login from "../views/Auth/Login.vue";
import Register from "../views/Auth/Register.vue";
import ForgotPassword from "../views/Auth/ForgotPassword.vue";
import ProfileForm from "@/views/Profile/ProfileForm.vue";
import ProfilPrive from "../views/Profile/ProfilPrive.vue";
import ProfilPublic from "../views/Profile/ProfilPublic.vue";
import DogProfile from "../views/Profile/DogProfile.vue";
import EditDogProfile from "../views/Profile/EditDogProfile.vue";
import Meetups from "../views/Meetups/Meetups.vue";
import MeetupForm from "../views/Meetups/MeetupForm.vue";
import MeetupDetail from "@/views/Meetups/MeetupDetail.vue";
import MapMeetups from "@/views/Meetups/MapMeetups.vue";
import Friends from "../views/Friends.vue";
import Chats from "../views/Chat/Chats.vue";
import Convo from "../views/Chat/Convo.vue";
import Notifications from "@/views/Notifications.vue";
import Settings from "../views/Settings/Settings.vue";
import Terms from "../views/Settings/Terms.vue";
import Privacy from "../views/Settings/Privacy.vue";
import DeleteAccount from "@/views/Settings/DeleteAccount.vue";
import ChangePassword from "@/views/Settings/ChangePassword.vue";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const routes: Array<RouteRecordRaw> = [
  { path: "/", redirect: "/landing" },
  {
    path: "/landing",
    name: "Landing",
    component: () => import("@/views/LandingPage.vue"),
  },

  // ===== Onglets principaux =====
  {
    path: "/tabs/",
    component: TabsPage,
    children: [
      { path: "", redirect: "/tabs/meetups" },
      {
        path: "profilPrive",
        component: ProfilPrive,
        name: "profilPrive",
        meta: { requiresAuth: true },
      },
      {
        path: "meetups",
        component: Meetups,
        name: "meetups",
        meta: { requiresAuth: true },
      },
      {
        path: "chats",
        component: Chats,
        name: "chats",
        meta: { requiresAuth: true },
      },
      {
        path: "notifications",
        component: Notifications,
        name: "notif",
        meta: { requiresAuth: true },
      },
      {
        path: "meetups-map",
        component: MapMeetups,
        name: "meetupsMap",
        meta: { requiresAuth: true },
      },
      {
        path: "profile/dogs/new",
        component: DogProfile,
        name: "DogProfile", // création d'un chien
        meta: { requiresAuth: true },
      },
      {
        path: "profile/dogs/:id",
        component: EditDogProfile,
        name: "EditDogProfile", // édition d'un chien (id requis)
        meta: { requiresAuth: true },
      },
    ],
  },

  // ===== Pages hors onglets =====
  {
    path: "/login",
    component: Login,
    name: "login",
    meta: { requiresGuest: true },
  },
  {
    path: "/register",
    component: Register,
    name: "register",
    meta: { requiresGuest: true },
  },
  {
    path: "/forgot-password",
    component: ForgotPassword,
    name: "forgot",
    meta: { requiresGuest: true },
  },
  {
    path: "/profile-form",
    component: ProfileForm,
    name: "ProfileForm",
  },
  {
    path: "/profilPublic/:userId",
    component: ProfilPublic,
    name: "profilPublic",
  },
  {
    path: "/meetup-form",
    component: MeetupForm,
    name: "MeetupForm",
  },
  {
    path: "/friends",
    component: Friends,
    name: "Friends",
  },
  {
    path: "/chat/:id",
    component: Convo,
    name: "Chat",
  },
  {
    path: "/settings",
    component: Settings,
    name: "Settings",
  },
  {
    path: "/terms",
    component: Terms,
    name: "Terms",
  },
  {
    path: "/privacy",
    component: Privacy,
    name: "Privacy",
  },
  {
    path: "/deleteAccount",
    component: DeleteAccount,
    name: "DeleteAccount",
  },
  {
    path: "/changePassword",
    component: ChangePassword,
    name: "ChangePassword",
  },
  {
    path: "/meetups/:id",
    name: "MeetupDetail",
    component: MeetupDetail,
    meta: { requiresAuth: true },
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ========= Garde d’authentification =========
function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        unsub();
        resolve(user);
      },
      reject
    );
  });
}

router.beforeEach(async (to, _from, next) => {
  const requiresAuth = Boolean(to.meta.requiresAuth);
  const requiresGuest = Boolean(to.meta.requiresGuest);
  const user = await getCurrentUser();

  if (requiresAuth && !user) {
    next({ name: "login", query: { redirect: to.fullPath } });
  } else if (requiresGuest && user) {
    next({ name: "meetups" });
  } else {
    next();
  }
});

export default router;
