<template>
  <div class="avatar-wrapper" :style="wrapperStyle">
    <label class="avatar" :class="{ readonly, clickable: !readonly }" :style="avatarStyle" @mousedown="startLongPress"
      @mouseup="cancelLongPress" @mouseleave="cancelLongPress" @touchstart="startLongPress" @touchend="cancelLongPress">
      <!-- Image si dispo -->
      <img :src="displayUrl || defaultAvatar" alt="Avatar" class="avatar-img" @error="onImgError" />

      <!-- Overlay caméra (upload possible) -->
      <div v-if="!readonly" class="overlay">
        <svg viewBox="0 0 256 256" class="camera">
          <path
            d="M216,72H176l-8-16H88L80,72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Z"
            fill="currentColor" opacity="0.18" />
          <path
            d="M216,72H176l-8-16H88L80,72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Z"
            fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" />
          <circle cx="128" cy="144" r="36" fill="none" stroke="currentColor" stroke-width="12" />
        </svg>
      </div>

      <input v-if="!readonly" ref="fileInput" type="file" class="file" :accept="accept" @change="onFileChange" />
    </label>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from "vue";
import { auth } from "@/lib/firebase";
import { uploadAvatar, ensureHttpUrl } from "@/lib/supabase";
import defaultAvatar from '@/assets/image/clanimo-default-dog-avatar.png';

// Props
const props = defineProps({
  modelValue: { type: String, default: "" },
  readonly: { type: Boolean, default: false },
  /** 'user' | 'dog' — placeholder + choix dossier d’upload */
  kind: { type: String, default: "user" },
  /** 'users' | 'dogs' — dossier d’upload (RLS exige users/... ou dogs/...) */
  folder: {
    type: String,
    default: "users",
    validator: (v) => ["users", "dogs"].includes(v),
  },
  /** Taille en px du cercle */
  size: { type: Number, default: 128 },
  /** accept mime */
  accept: {
    type: String,
    default: "image/png,image/jpeg,image/webp,image/gif",
  },

  // compat héritée (désactivée) — ignorées pour éviter erreurs RLS
  folder: { type: String, default: "" },
  storagePath: { type: String, default: "" },
});

// Emits
const emit = defineEmits(["update:modelValue", "uploaded"]);

// State
const fileInput = ref(null);
const displayUrl = ref("");
const errored = ref(false);
const kind = computed(() => (props.kind === "dog" ? "dog" : "user"));

// Mount & watch
onMounted(() => {
  displayUrl.value = ensureHttpUrl(props.modelValue);
});

watch(
  () => props.modelValue,
  (v) => {
    displayUrl.value = ensureHttpUrl(v);
    errored.value = false;
  }
);

// Styles
const wrapperStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));

// Handlers
function onImgError() {
  errored.value = true;
  displayUrl.value = ""; // force placeholder
}

// SUpprimer l'avatar apres un apuis long
let longPressTimer = null;
const LONG_PRESS_DURATION = 1000;

function startLongPress() {
  if (!displayUrl.value || props.readonly) return;

  longPressTimer = setTimeout(() => {
    if (confirm("Êtes-vous sûr de vouloir supprimer l’image actuelle ?")) {
      deleteAvatar();
    }
  }, LONG_PRESS_DURATION);
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function deleteAvatar() {
  displayUrl.value = "";
  emit("update:modelValue", "");
}

async function onFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  // Compat messages
  if (props.prefix) {
    console.warn("[Avatar] prop `prefix` est obsolète et ignoré (RLS Supabase). Utilise `folder`.");
  }
  if (props.storagePath) {
    console.warn("[Avatar] prop `storagePath` est obsolète et ignoré (RLS Supabase). Utilise `folder`.");
  }

  // Auth
  const uid = auth.currentUser?.uid;
  if (!uid) {
    alert("Vous devez être connecté pour téléverser une image.");
    // reset input pour permettre reselect
    if (fileInput.value) fileInput.value.value = "";
    return;
  }

  try {
    // Upload via helper (chemin conforme RLS: users/<uid>/… ou dogs/<uid>/…)
    const { url } = await uploadAvatar(file, props.folder === "dogs" ? "dogs" : "users", uid, { upsert: true });

    displayUrl.value = url;
    emit("update:modelValue", url);
    emit("uploaded", { url });

  } catch (err) {
    console.error("[Avatar] upload error", err);
    alert("Échec du téléversement (vérifiez les permissions du bucket et les policies RLS).");
  } finally {
    // reset input (permet reupload du même fichier)
    if (fileInput.value) fileInput.value.value = "";
  }
}
</script>

<style scoped>
.avatar-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  position: relative;
  border-radius: 9999px;
  overflow: hidden;
  border: 2px dashed var(--dark-beige);
  background: #fff;
  color: var(--beige-pink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform .08s ease;
}

.avatar.clickable {
  cursor: pointer;
}

.avatar.clickable:hover {
  border-color: var(--yellow);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
}

.avatar.clickable:active {
  transform: scale(.98);
}

.avatar.readonly {
  cursor: default;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Placeholder vectoriel */
.placeholder {
  width: 70%;
  height: 70%;
  display: grid;
  place-items: center;
}

.ph-svg {
  width: 100%;
  height: 100%;
  color: var(--beige-pink);
}

/* Overlay caméra au survol */
.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  opacity: 0;
  background: rgba(0, 0, 0, 0.08);
  transition: opacity .15s ease;
}

.avatar.clickable:hover .overlay {
  opacity: 1;
}

.camera {
  width: 42%;
  height: 42%;
  background: var(--yellow);
  color: var(--dark-blue);
  border-radius: 16px;
  padding: 8px;
}

/* input file natif caché */
.file {
  display: none;
}
</style>
