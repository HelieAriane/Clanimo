<template>
  <ion-chip v-for="tag in allTags" :key="tag" class="personality-tag" outline :style="getTagStyle(tag)"
    @click="toggleTag(tag)">
    {{ tag }}
  </ion-chip>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue"]);

const allTags = ref([
  "Joueur",
  "Calme",
  "Énergique",
  "Paresseux",
  "Curieux",
  "Indépendant",
  "Protecteur",
  "Affectueux",
  "Timide",
  "Loyal",
  "Sociable",
  "Nerveux",
  "Méfiant",
  "Anxieux",
  "Dominant",
  "Soumis",
  "Sportif",
  "Tranquille",
  "Obéissant",
  "Têtu",
  "Chasseur",
  "Leader",
  "Suiveur",
  "Solitaire",
]);

const toggleTag = (tag) => {
  const newTags = [...props.modelValue];
  const index = newTags.indexOf(tag);
  if (index > -1) newTags.splice(index, 1);
  else newTags.push(tag);
  emit("update:modelValue", newTags);
};

const getTagStyle = (tag) => {
  const isSelected = props.modelValue.includes(tag);
  if (isSelected) {
    return {
      backgroundColor: "var(--button-bg-color)",
      color: "var(--button-text-color)",
      border: "none",
      borderRadius: "20px",
      padding: "5px 12px",
      margin: "4px",
      cursor: "pointer",
    };
  } else {
    return {
      backgroundColor: "transparent",
      color: "var(--button-text-color)",
      border: "1px solid var(--button-bg-color)",
      borderRadius: "20px",
      padding: "5px 12px",
      margin: "4px",
      cursor: "pointer",
    };
  }
};
</script>

<style scoped>
:root {
  --main-bg-color: #f7ece2;
  --input-bg-color: #d0c0c6;
  --button-bg-color: #f2d346;
  --button-text-color: #32354b;
  --text-color: #32354b;
  --link-color: #895d6d;
  --font-family: "Plus Jakarta Sans", sans-serif;
}

.personality-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
