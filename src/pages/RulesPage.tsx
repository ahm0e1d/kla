import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Rule {
  id: string;
  content: string;
  sort_order: number;
}

interface RuleCategory {
  id: string;
  name: string;
  sort_order: number;
  rules: Rule[];
}

const RulesPage = () => {
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("rule_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch rules
      const { data: rulesData, error: rulesError } = await supabase
        .from("rules")
        .select("*")
        .order("sort_order", { ascending: true });

      if (rulesError) throw rulesError;

      // Group rules by category
      const categoriesWithRules = (categoriesData || []).map((category) => ({
        ...category,
        rules: (rulesData || []).filter((rule) => rule.category_id === category.id),
      }));

      setCategories(categoriesWithRules);
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">القوانين</h1>
          <p className="text-muted-foreground">يرجى قراءة القوانين والالتزام بها</p>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ScrollText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              لا توجد قوانين حالياً
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {categories.map((category, categoryIndex) => (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="bg-primary/10 border-b border-border">
                  <CardTitle className="flex items-center gap-3">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {categoryIndex + 1}
                    </span>
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {category.rules.length === 0 ? (
                    <p className="p-6 text-muted-foreground text-center">
                      لا توجد قوانين في هذا القسم
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {category.rules.map((rule, ruleIndex) => (
                        <li key={rule.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex gap-4">
                            <span className="text-primary font-bold min-w-[2rem]">
                              {categoryIndex + 1}.{ruleIndex + 1}
                            </span>
                            <p className="text-foreground">{rule.content}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RulesPage;
