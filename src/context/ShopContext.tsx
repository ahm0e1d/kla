import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, CartItem } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";

interface ShopContextType {
  products: Product[];
  cart: CartItem[];
  loading: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  updateProduct: (product: Product) => Promise<void>;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  cartTotal: number;
  cartItemsCount: number;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("walker-cart");
    return saved ? JSON.parse(saved) : [];
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
    } else if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem("walker-cart", JSON.stringify(cart));
  }, [cart]);

  const refreshProducts = async () => {
    await fetchProducts();
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, cartQuantity: quantity } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const updateProduct = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: product.quantity,
        image: product.image,
        rating: product.rating,
      })
      .eq("id", product.id);

    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }
    
    await fetchProducts();
  };

  const addProduct = async (product: Omit<Product, "id">) => {
    const { error } = await supabase.from("products").insert({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      image: product.image,
      rating: product.rating,
    });

    if (error) {
      console.error("Error adding product:", error);
      throw error;
    }
    
    await fetchProducts();
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
    
    await fetchProducts();
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.cartQuantity,
    0
  );

  const cartItemsCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  return (
    <ShopContext.Provider
      value={{
        products,
        cart,
        loading,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        updateProduct,
        addProduct,
        deleteProduct,
        refreshProducts,
        cartTotal,
        cartItemsCount,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};
