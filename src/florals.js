const art = (file) => `${import.meta.env.BASE_URL}art/${file}`;
export const flowerTypes = [
  { key: "rose", name: "Mawar", src: art("botanical-rose.webp") },
  { key: "tulip", name: "Tulip", src: art("botanical-tulip.webp") },
  { key: "anemone", name: "Anemone", src: art("botanical-anemone.webp") },
];
export const flowerSrc = (kind) =>
  kind === "bouquet"
    ? art("romantic-roses.webp")
    : flowerTypes.find((flower) => flower.key === kind).src;
