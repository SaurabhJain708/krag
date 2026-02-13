"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth-user";
import { trpc } from "@/server/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  BookOpen,
  FileText,
  Database,
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ENCRYPTION_KEY_STORAGE =
  process.env.ENCRYPTION_KEY_STORAGE || "encryption_key";

export default function SettingsPage() {
  const user = useCurrentUser();
  const { data: stats, isLoading } = trpc.userRouter.getStats.useQuery();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [encryptionKey, setEncryptionKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [simpleEncryption, setSimpleEncryption] = useState(false);
  const [advancedEncryption, setAdvancedEncryption] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllDataModal, setShowDeleteAllDataModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const CONFIRMATION_TEXT = "YES I WANT TO DELETE ALL DATA";

  const deleteAllDataMutation = trpc.userRouter.deleteAllData.useMutation({
    onSuccess: () => {
      setShowDeleteAllDataModal(false);
      utils.notebookRouter.getNotebooks.invalidate();
      router.push("/notebooks");
    },
  });

  const deleteAllEncryptedDataMutation =
    trpc.userRouter.deleteAllEncryptedData.useMutation({
      onSuccess: () => {
        utils.notebookRouter.getNotebooks.invalidate();
      },
    });

  const handleEncryptionMutation =
    trpc.userRouter.handleEncryption.useMutation();

  // Load encryption settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
      if (storedKey) {
        setEncryptionKey(storedKey);
        setHasStoredKey(true);
      }
    }
  }, []);

  // Initialize encryption toggles from authenticated user
  useEffect(() => {
    if (!user) return;

    if (user.encryption === "SimpleEncryption") {
      setSimpleEncryption(true);
      setAdvancedEncryption(false);
    } else if (user.encryption === "AdvancedEncryption") {
      setSimpleEncryption(false);
      setAdvancedEncryption(true);
    } else {
      setSimpleEncryption(false);
      setAdvancedEncryption(false);
    }
  }, [user]);

  const handleSaveKey = () => {
    if (encryptionKey.trim() && typeof window !== "undefined") {
      localStorage.setItem(ENCRYPTION_KEY_STORAGE, encryptionKey);
      setIsSaved(true);
      setHasStoredKey(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleDeleteKey = () => {
    if (typeof window !== "undefined") {
      // Trigger backend cleanup of all encrypted data when the key is removed
      deleteAllEncryptedDataMutation.mutate();

      localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
      setEncryptionKey("");
      setHasStoredKey(false);
      setShowDeleteModal(false);
    }
  };

  const setEncryptionMode = (
    mode: "SimpleEncryption" | "AdvancedEncryption" | "NotEncrypted"
  ) => {
    setSimpleEncryption(mode === "SimpleEncryption");
    setAdvancedEncryption(mode === "AdvancedEncryption");
    handleEncryptionMutation.mutate({ encryption: mode });
  };

  const generateStrongKey = () => {
    // Generate 32 random bytes (64 hex characters)
    const array = new Uint8Array(32);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(array);
      // Convert to hex string
      const hexKey = Array.from(array)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setEncryptionKey(hexKey);
      setShowKey(true); // Show the generated key
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/notebooks")}
              className="hover:bg-accent/50 cursor-pointer rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Manage your account settings and view your usage statistics
          </p>
        </div>

        <div className="grid gap-6">
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="border-border relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 bg-linear-to-br from-blue-500 to-purple-600">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="mb-1 text-2xl font-semibold">
                    {user?.name || "User"}
                  </h2>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="border-0 bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-sm"
                  >
                    PRO
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    Default Plan
                  </span>
                </div>
                <span className="text-muted-foreground text-sm italic">
                  Coming soon
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>
                Overview of your account activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted h-20 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Notebooks Count */}
                  <div className="bg-card flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                      <BookOpen className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {stats?.notebookCount ?? 0}
                      </p>
                      <p className="text-muted-foreground text-sm">Notebooks</p>
                    </div>
                  </div>

                  {/* Files Count */}
                  <div className="bg-card flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                      <FileText className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {stats?.fileCount ?? 0}
                      </p>
                      <p className="text-muted-foreground text-sm">Files</p>
                    </div>
                  </div>

                  {/* Sources Count */}
                  <div className="bg-card flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                      <Database className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {stats?.sourceCount ?? 0}
                      </p>
                      <p className="text-muted-foreground text-sm">Sources</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Encryption Key Card */}
          <Card>
            <CardHeader>
              <CardTitle>Encryption Key</CardTitle>
              <CardDescription>
                Manage your encryption key for secure data storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="encryption-key">Encryption Key</Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="encryption-key"
                        type={showKey ? "text" : "password"}
                        placeholder={
                          hasStoredKey
                            ? "Encryption key is set"
                            : "Enter your encryption key"
                        }
                        value={encryptionKey}
                        onChange={(e) => setEncryptionKey(e.target.value)}
                        disabled={hasStoredKey}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full cursor-pointer hover:bg-transparent"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? (
                          <EyeOff className="text-muted-foreground h-4 w-4" />
                        ) : (
                          <Eye className="text-muted-foreground h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {!hasStoredKey && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateStrongKey}
                        className="shrink-0 cursor-pointer"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Generate Key
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Your encryption key is stored locally on your device and
                    never sent to our servers.
                  </p>
                </div>

                {/* Encryption Type Toggles */}
                <div className="space-y-4 border-t pt-4">
                  {!hasStoredKey && (
                    <p className="text-muted-foreground pb-2 text-xs">
                      Save an encryption key to enable encryption options.
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-0.5">
                      <Label
                        htmlFor="simple-encryption"
                        className={`text-base font-medium ${hasStoredKey ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                      >
                        Simple Encryption
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        Basic encryption for your data
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Switch
                        id="simple-encryption"
                        checked={simpleEncryption}
                        onCheckedChange={(checked) => {
                          if (!hasStoredKey) return;
                          const mode = checked
                            ? "SimpleEncryption"
                            : advancedEncryption
                              ? "AdvancedEncryption"
                              : "NotEncrypted";
                          setEncryptionMode(mode);
                        }}
                        disabled={!hasStoredKey}
                        className={
                          hasStoredKey
                            ? "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input cursor-pointer"
                            : "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input cursor-pointer"
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <Label
                        htmlFor="advanced-encryption"
                        className={`text-base font-medium ${hasStoredKey ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                      >
                        Advanced Encryption
                      </Label>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                          Enhanced security with stronger encryption.
                        </p>
                        <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                            <span className="font-medium">Note:</span> This may
                            hamper retrieval quality as chunks will be
                            encrypted, disabling keyword search.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Switch
                        id="advanced-encryption"
                        checked={advancedEncryption}
                        onCheckedChange={(checked) => {
                          if (!hasStoredKey) return;
                          const mode = checked
                            ? "AdvancedEncryption"
                            : simpleEncryption
                              ? "SimpleEncryption"
                              : "NotEncrypted";
                          setEncryptionMode(mode);
                        }}
                        disabled={!hasStoredKey}
                        className={
                          hasStoredKey
                            ? "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input cursor-pointer"
                            : "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input cursor-pointer"
                        }
                      />
                    </div>
                  </div>
                </div>

                {!hasStoredKey ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveKey}
                      disabled={!encryptionKey.trim()}
                      className="cursor-pointer"
                    >
                      {isSaved ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Save Key
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteModal(true)}
                      className="cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Key
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone Card */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-destructive/20 bg-destructive/5 flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <h3 className="text-destructive font-semibold">
                      Delete All Data
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Permanently delete all your notebooks, files, sources, and
                      messages. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteAllDataModal(true)}
                    className="shrink-0 cursor-pointer"
                    disabled={deleteAllDataMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete All Data Confirmation Modal */}
      <Dialog
        open={showDeleteAllDataModal}
        onOpenChange={(open) => {
          setShowDeleteAllDataModal(open);
          if (!open) {
            setDeleteConfirmationText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete All Data?
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure? This will permanently delete all your
              notebooks, files, sources, messages, and all associated data. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="delete-confirmation"
                className="text-sm font-medium"
              >
                Type{" "}
                <span className="text-destructive font-mono">
                  {CONFIRMATION_TEXT}
                </span>{" "}
                to confirm:
              </Label>
              <Input
                id="delete-confirmation"
                type="text"
                placeholder={CONFIRMATION_TEXT}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="font-mono"
                disabled={deleteAllDataMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteAllDataModal(false);
                setDeleteConfirmationText("");
              }}
              className="cursor-pointer"
              disabled={deleteAllDataMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllDataMutation.mutate()}
              className="cursor-pointer"
              disabled={
                deleteAllDataMutation.isPending ||
                deleteConfirmationText !== CONFIRMATION_TEXT
              }
            >
              {deleteAllDataMutation.isPending ? (
                <>Deleting...</>
              ) : (
                <>Delete All Data</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Encryption Key?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your encryption key? All encrypted
              data will be permanently deleted and cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKey}
              className="cursor-pointer"
            >
              Delete Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
