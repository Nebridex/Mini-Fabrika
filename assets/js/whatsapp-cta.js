(() => {
  const PHONE_PARTS = ["90", "545", "690", "0094"];
  const MESSAGE = "Merhaba MiniFabrika, hazır STL/3MF/OBJ dosyamla adetli 3D baskı üretimi hakkında bilgi almak istiyorum.";

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-whatsapp-cta]");
    if (!trigger) return;

    event.preventDefault();
    const phone = PHONE_PARTS.join("");
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(MESSAGE)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  });
})();
