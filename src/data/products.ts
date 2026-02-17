import { Product } from "@/types/product";
import woodImage from "@/assets/products/wood.png";
import clothesImage from "@/assets/products/clothes.png";
import poultryImage from "@/assets/products/poultry.png";
import vegetablesImage from "@/assets/products/vegetables.png";
import oilGasImage from "@/assets/products/oil-gas.png";

export const initialProducts: Product[] = [
  {
    id: "1",
    name: "خشب مقطع",
    description: "خشب عالي الجودة للبناء والتصنيع",
    price: 35000,
    quantity: 150,
    image: woodImage,
    rating: 4,
  },
  {
    id: "2",
    name: "ملابس",
    description: "ملابس متنوعة بأفضل الأسعار",
    price: 50000,
    quantity: 120,
    image: clothesImage,
    rating: 5,
  },
  {
    id: "3",
    name: "دواجن",
    description: "دواجن طازجة ومجمدة",
    price: 25000,
    quantity: 150,
    image: poultryImage,
    rating: 4,
  },
  {
    id: "4",
    name: "خضراوات",
    description: "خضراوات طازجة من المزرعة",
    price: 35000,
    quantity: 150,
    image: vegetablesImage,
    rating: 5,
  },
  {
    id: "5",
    name: "نفط وغاز",
    description: "منتجات نفطية وغازية",
    price: 55000,
    quantity: 60,
    image: oilGasImage,
    rating: 4,
  },
];
