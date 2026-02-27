(() => {
  const PHONE_PARTS = ["90", "545", "690", "0094"];
  const MESSAGE = "Merhaba, MiniFabrika’dan 3D baskı teklifi almak istiyorum. Model linkim/dosyalarım hazır.";

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-whatsapp-cta]");
    if (!trigger) return;

    event.preventDefault();
    const phone = PHONE_PARTS.join("");
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(MESSAGE)}`;
    window.open(href, "_blank", "noopener,noreferrer");
  });
})();
