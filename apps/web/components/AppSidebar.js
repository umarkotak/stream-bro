import Link from "next/link";
import { useRouter } from "next/router";
import { Home, PencilRuler, Radio, Sparkles, WandSparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const AVATAR_MENU = [
  { label: "Studio", href: "/virtual-avatar/v1/studio", icon: Sparkles },
  { label: "Live", href: "/virtual-avatar/v1/live", icon: Radio },
  { label: "Editor", href: "/virtual-avatar/v1/editor", icon: PencilRuler },
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const { pathname } = useRouter();

  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" />} isActive={pathname === "/"} size="lg" tooltip="Creator Buddy">
              <WandSparkles />
              <span>Creator Buddy</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/" />} isActive={pathname === "/"} tooltip="Home">
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/virtual-avatar/v1/studio" />} isActive={pathname.startsWith("/virtual-avatar/")} tooltip="Virtual Avatar">
                  <Sparkles />
                  <span>Virtual Avatar</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {AVATAR_MENU.map(({ label, href, icon: Icon }) => (
                    <SidebarMenuSubItem key={href}>
                      <SidebarMenuSubButton render={<Link href={href} />} isActive={isActive(pathname, href)}>
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/avatar-helper" />} isActive={pathname === "/avatar-helper"} tooltip="Prompt Builder">
                  <WandSparkles />
                  <span>Prompt Builder</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-[11px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">Local tools for OBS creators.</p>
      </SidebarFooter>
    </Sidebar>
  );
}
