import { Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Product } from "@/types/product";
import { useShop } from "@/context/ShopContext";
import { useToast } from "@/hooks/use-toast";
import { useStoreStatus } from "@/hooks/useStoreStatus";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useShop();
  const { toast } = useToast();
  const { isOpen, storeHours } = useStoreStatus();

  const handleAddToCart = () => {
    if (!isOpen) {
      toast({
        title: "المتجر مغلق",
        description: storeHours 
          ? `أوقات العمل: من ${storeHours.openTime} إلى ${storeHours.closeTime}`
          : "المتجر مغلق حالياً",
        variant: "destructive",
      });
      return;
    }
    if (product.quantity <= 0) {
      toast({
        title: "غير متوفر",
        description: "هذا المنتج غير متوفر حالياً",
        variant: "destructive",
      });
      return;
    }
    addToCart(product);
    toast({
      title: "تمت الإضافة",
      description: `تم إضافة ${product.name} إلى السلة`,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ar-SA").format(price);
  };

  return (
    <Card className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:glow-red animate-fade-in">
      <div className="p-6">
        <div className="aspect-[4/3] rounded-xl bg-muted flex items-center justify-center mb-4 overflow-hidden group-hover:scale-105 transition-transform duration-500">
          {product.image.startsWith('http') ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <span className="text-6xl">{product.image}</span>
          )}
        </div>

        <h3 className="text-xl font-bold text-foreground mb-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{product.description}</p>

        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < product.rating
                  ? "text-accent fill-accent"
                  : "text-muted-foreground"
              }`}
            />
          ))}
          <span className="text-sm text-muted-foreground mr-2">التقييمات</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xl font-bold text-accent">
            {formatPrice(product.price)}
          </span>
          <span className="text-sm text-muted-foreground">
            الكمية: {product.quantity}
          </span>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={product.quantity <= 0 || !isOpen}
          className={`w-full font-semibold py-6 text-lg transition-all duration-300 ${
            !isOpen 
              ? "bg-muted text-muted-foreground opacity-60 cursor-not-allowed" 
              : "bg-primary hover:bg-primary/80 text-primary-foreground hover:scale-[1.02]"
          }`}
        >
          {!isOpen ? (
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              المتجر مغلق
            </span>
          ) : (
            "أضف إلى السلة"
          )}
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;
