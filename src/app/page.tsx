import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./landing.css";
import { LandingPage } from "@/components/landing-page";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
});

export default function Home() {
  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}>
      <LandingPage />
    </div>
  );
}
