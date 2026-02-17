export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  rating: number;
}

export interface CartItem extends Product {
  cartQuantity: number;
}
