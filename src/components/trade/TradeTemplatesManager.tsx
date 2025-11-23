import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Bookmark, Plus, Trash2 } from "lucide-react";

interface TradeTemplate {
  id: string;
  name: string;
  description: string | null;
  template_data: any;
  use_count: number;
}

export function TradeTemplatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", description: "" });

  const { data: templates } = useQuery({
    queryKey: ["trade-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_templates")
        .select("*")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return data as TradeTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: { name: string; description: string; template_data: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("trade_templates").insert({
        user_id: user.id,
        ...template,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template saved!" });
      queryClient.invalidateQueries({ queryKey: ["trade-templates"] });
      setIsOpen(false);
      setNewTemplate({ name: "", description: "" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trade_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      queryClient.invalidateQueries({ queryKey: ["trade-templates"] });
    },
  });

  const handleSaveTemplate = () => {
    if (!newTemplate.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    createTemplate.mutate({
      ...newTemplate,
      template_data: {}, // Will be populated from trade builder
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Trade Templates
        </h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Trade Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., My Charizards for Lugias"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Optional notes about this template"
                />
              </div>
              <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending}>
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates?.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold">{template.name}</h4>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Used {template.use_count} times
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTemplate.mutate(template.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
