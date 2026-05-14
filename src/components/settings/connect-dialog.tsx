"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREDENTIAL_SCHEMA } from "@/lib/integration-credentials";
import { SOURCE_NAMES } from "@/lib/constants";
import type { IntegrationSource } from "@/lib/types";

export function ConnectDialog({
  source,
  open,
  onOpenChange,
  onConnected,
}: {
  source: IntegrationSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}) {
  const schema = CREDENTIAL_SCHEMA[source] || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    for (const f of schema) {
      if (f.required && !values[f.name]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/integrations/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to connect");
      }
      toast.success(`${SOURCE_NAMES[source]} connected`);
      setValues({});
      onConnected();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setValues({});
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {SOURCE_NAMES[source]}</DialogTitle>
          <DialogDescription>
            Enter the credentials for your {SOURCE_NAMES[source]} account. They're encrypted before storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {schema.map((field) => (
            <div key={field.name} className="space-y-1">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </Label>
              <Input
                id={field.name}
                type={field.type || "text"}
                placeholder={field.placeholder}
                value={values[field.name] || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.name]: e.target.value }))
                }
              />
              {field.hint && (
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
