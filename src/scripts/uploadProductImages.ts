import { supabase } from "@/integrations/supabase/client";
import woodImage from "@/assets/products/wood.png";
import clothesImage from "@/assets/products/clothes.png";
import poultryImage from "@/assets/products/poultry.png";
import vegetablesImage from "@/assets/products/vegetables.png";
import oilGasImage from "@/assets/products/oil-gas.png";

const productImages = [
  { name: "خشب مقطع", image: woodImage, fileName: "wood.png" },
  { name: "ملابس", image: clothesImage, fileName: "clothes.png" },
  { name: "دواجن", image: poultryImage, fileName: "poultry.png" },
  { name: "خضراوات", image: vegetablesImage, fileName: "vegetables.png" },
  { name: "نفط وغاز", image: oilGasImage, fileName: "oil-gas.png" },
];

export async function uploadProductImages() {
  for (const product of productImages) {
    try {
      // Fetch the image as blob
      const response = await fetch(product.image);
      const blob = await response.blob();
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const base64 = await base64Promise;

      // Upload to storage
      const { data, error } = await supabase.functions.invoke("upload-local-images", {
        body: {
          imageBase64: base64,
          fileName: product.fileName,
          contentType: "image/png",
        },
      });

      if (error) {
        console.error(`Failed to upload ${product.name}:`, error);
        continue;
      }

      // Update product in database
      if (data?.imageUrl) {
        await supabase
          .from("products")
          .update({ image: data.imageUrl })
          .eq("name", product.name);
        console.log(`Updated ${product.name} with image: ${data.imageUrl}`);
      }
    } catch (err) {
      console.error(`Error processing ${product.name}:`, err);
    }
  }
}
