import "@/styles/globals.css";
import Link from "next/link";
import { Fragment } from "react";
import { useRouter } from "next/router";
import AppSidebar from "@/components/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const BREADCRUMBS = {
  "/avatar-helper": ["Prompt Builder"],
  "/virtual-avatar/v1/studio": ["Virtual Avatar", "Studio"],
  "/virtual-avatar/v1/live": ["Virtual Avatar", "Live"],
  "/virtual-avatar/v1/editor": ["Virtual Avatar", "Editor"],
};

function AppBreadcrumbs({ pathname }) {
  const items = BREADCRUMBS[pathname] || [];
  const virtualAvatarHref = "/virtual-avatar/v1/studio";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathname === "/" ? (
          <BreadcrumbItem><BreadcrumbPage>Home</BreadcrumbPage></BreadcrumbItem>
        ) : (
          <BreadcrumbItem><BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink></BreadcrumbItem>
        )}
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const href = item === "Virtual Avatar" ? virtualAvatarHref : null;
          return (
            <Fragment key={item}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isCurrent || !href
                  ? <BreadcrumbPage>{item}</BreadcrumbPage>
                  : <BreadcrumbLink render={<Link href={href} />}>{item}</BreadcrumbLink>}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function App({ Component, pageProps }) {
  const { pathname } = useRouter();
  const isOverlayRenderer = pathname === "/virtual-avatar/v1/live/avatar";
  const isLiveSetup = pathname === "/virtual-avatar/v1/live";
  const isEditor = pathname === "/virtual-avatar/v1/editor";
  const hideAllChrome = isOverlayRenderer || isLiveSetup;

  return (
    <TooltipProvider>
      {hideAllChrome ? <Component {...pageProps} /> : isEditor ? (
        <div className="creator-app-content">
          <header className="creator-app-bar">
            <AppBreadcrumbs pathname={pathname} />
          </header>
          <Component {...pageProps} />
        </div>
      ) : (
        <SidebarProvider>
          <AppSidebar />
          <div className="creator-app-content">
            <header className="creator-app-bar">
              <SidebarTrigger />
              <AppBreadcrumbs pathname={pathname} />
            </header>
            <Component {...pageProps} />
          </div>
        </SidebarProvider>
      )}
    </TooltipProvider>
  );
}
