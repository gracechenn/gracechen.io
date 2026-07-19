import type { Metadata } from "next";
import "@/styles/main.css";
import AgentationToolbar from "@/components/AgentationToolbar";

const DESCRIPTION =
  "Grace is a 0→1 product designer that ships experiences for industry giants and startups with craft and simplicity. She enjoys telling stories, fostering design communities, and building dynamic visual systems.";

export const metadata: Metadata = {
  metadataBase: new URL("https://gracechen.io"),
  title: {
    default: "Grace Chen",
    template: "%s · Grace Chen",
  },
  description: DESCRIPTION,
  icons: {
    icon: "/assets/images/favicon.png",
    apple: "/assets/images/webclip.png",
  },
  verification: {
    google: "W2fQwPRNxeuNOE1IY3M5_WYl42qLxGCoxaRrWCwz6U0",
  },
  openGraph: {
    title: "Grace Chen",
    description: DESCRIPTION,
    url: "/",
    siteName: "Grace Chen",
    type: "website",
    images: [{ url: "/assets/images/webclip.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grace Chen",
    description: DESCRIPTION,
    images: ["/assets/images/webclip.png"],
  },
};

const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Varela",
    "family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,400",
    "family=Montserrat:ital,wght@0,100..900;1,100..900",
    "family=Inconsolata:wght@400;700",
    "family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700",
    "family=Newsreader:wght@300..700",
    "family=Shippori+Mincho:wght@400;500;600;700;800",
    "family=Space+Grotesk:wght@300..700",
    "family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700",
    "family=Work+Sans:ital,wght@0,100..900;1,100..900",
  ].join("&") +
  "&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === "development" && <AgentationToolbar />}
      </body>
    </html>
  );
}
