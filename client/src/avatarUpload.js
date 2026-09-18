// Turns a user-chosen photo into a small square data URL, entirely in the
// browser — resized/compressed before it's ever sent anywhere, so a normal
// phone photo (several MB) becomes a few KB instead of bloating every
// socket broadcast in the room.
const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024; // reject absurd uploads before even trying to decode them
const OUTPUT_SIZE = 160; // px, square
const OUTPUT_QUALITY = 0.85;

export function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      reject(new Error("That image is too large (max 8MB) — try a smaller one."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        // Center-crop to a square, then downscale — keeps faces centered
        // regardless of the original photo's aspect ratio.
        const cropSize = Math.min(img.width, img.height);
        const sx = (img.width - cropSize) / 2;
        const sy = (img.height - cropSize) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        resolve(canvas.toDataURL("image/jpeg", OUTPUT_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
