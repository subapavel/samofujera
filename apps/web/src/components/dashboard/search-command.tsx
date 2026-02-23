"use client";

import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@samofujera/ui";
import {
  LayoutDashboard, Package, FileText, ShoppingCart,
  Users, Image, Settings, Library,
} from "lucide-react";
import { useSearch } from "./search-provider";

export function SearchCommand() {
  const { open, setOpen } = useSearch();
  const router = useRouter();

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t`Hledat...`} />
      <CommandList>
        <CommandEmpty>{t`Žádné výsledky.`}</CommandEmpty>
        <CommandGroup heading={t`Administrace`}>
          <CommandItem onSelect={() => navigate("/admin")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>{t`Nástěnka`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/produkty")}>
            <Package className="mr-2 h-4 w-4" />
            <span>{t`Produkty`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/stranky")}>
            <FileText className="mr-2 h-4 w-4" />
            <span>{t`Stránky`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/objednavky")}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>{t`Objednávky`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/media")}>
            <Image className="mr-2 h-4 w-4" />
            <span>{t`Média`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/users")}>
            <Users className="mr-2 h-4 w-4" />
            <span>{t`Uživatelé`}</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t`Můj účet`}>
          <CommandItem onSelect={() => navigate("/muj-ucet")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>{t`Nástěnka`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/muj-ucet/knihovna")}>
            <Library className="mr-2 h-4 w-4" />
            <span>{t`Knihovna`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/muj-ucet/objednavky")}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>{t`Objednávky`}</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/muj-ucet/profile")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>{t`Profil`}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
