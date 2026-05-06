"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./mobile-nav";
import { ProjectSelector } from "./project-selector";
import { formatDate } from "@/lib/utils";
import { MOCK_RISK_ALERTS } from "@/lib/mock-data";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/timesheet": "Timesheet",
  "/alerts": "Risk Alerts",
  "/activity": "Activity Feed",
  "/settings": "Settings",
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = PAGE_TITLES[pathname] || "ProjectPulse";
  const unreadAlerts = MOCK_RISK_ALERTS.filter((a) => !a.isRead).length;

  const user = session?.user;
  const initials = getInitials(user?.name, user?.email);

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border bg-white">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" />
            }
          >
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <MobileSidebar />
          </SheetContent>
        </Sheet>

        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <div className="hidden sm:block ml-3">
          <ProjectSelector />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-sm text-muted-foreground">
          {formatDate(new Date().toISOString())}
        </span>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadAlerts > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadAlerts}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="w-8 h-8 cursor-pointer">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-medium">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
