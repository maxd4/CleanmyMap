"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { 
  ExternalLink, 
  MapPin, 
  Building2, 
  Share2,
  ArrowRight,
  Handshake,
  Users,
  Search,
  PlusCircle,
  FileText,
  Smartphone
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";
import { RubriqueCard } from "@/components/ui/rubrique-card";

interface ResourceLink {
  label: string;
  url: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface ExternalHubCardProps {
  title: string;
  icon: React.ReactNode;
  links: ResourceLink[];
  color: "emerald" | "blue" | "rose" | "violet";
}

function ExternalHubCard({ title, icon, links, color }: ExternalHubCardProps) {
  const colorGlowMap = {
    emerald: "group-hover:shadow-emerald-500/10",
    blue: "group-hover:shadow-blue-500/10",
    rose: "group-hover:shadow-rose-500/10",
    violet: "group-hover:shadow-violet-500/10",
  };

  const colorIconMap = {
    emerald: "text-emerald-400 bg-emerald-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    rose: "text-rose-400 bg-rose-400/10",
    violet: "text-violet-400 bg-violet-400/10",
  };

  return (
    <RubriqueCard 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      themeColor={color}
      className={cn(
        "group p-8",
        colorGlowMap[color]
      )}
    >
      <div className="flex items-center gap-4 mb-8">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-110",
          colorIconMap[color]
        )}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-black tracking-[0.1em] text-white uppercase">{title}</h3>
          <div className="h-0.5 w-8 bg-white/10 mt-1 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              whileInView={{ x: "0%" }}
              transition={{ delay: 0.5, duration: 1 }}
              className={cn("h-full w-full", {
                "bg-emerald-500": color === "emerald",
                "bg-blue-500": color === "blue",
                "bg-rose-500": color === "rose",
                "bg-violet-500": color === "violet",
              })}
            />
          </div>
        </div>
      </div>
      
      <div className="grid gap-3">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 transition-all hover:border-white/10 hover:bg-white/[0.08]"
          >
            <div className="flex items-center gap-3">
              <div className="text-white/40 group-hover/link:text-white transition-colors">
                {link.icon || <ExternalLink size={16} />}
              </div>
              <span className="text-sm font-bold text-white/70 group-hover/link:text-white transition-colors">
                {link.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {link.badge && (
                <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-black text-white/40 uppercase tracking-widest border border-white/5">
                  {link.badge}
                </span>
              )}
              <ArrowRight size={16} className="translate-x-0 text-white/20 transition-all group-hover/link:translate-x-1 group-hover/link:text-white" />
            </div>
          </a>
        ))}
      </div>
    </RubriqueCard>
  );
}

export function ExternalHubSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const sections = [
    {
      title: fr ? "Partenaires Terrain" : "Field Partners",
      color: "emerald" as const,
      icon: <Users size={24} />,
      links: [
        { label: "Partenaires CleanMyMap", url: "/sections/community?tab=partners", badge: "Live", icon: <MapPin size={16} /> },
        { label: "J'agis pour la nature", url: "https://jagispourlanature.fr" },
        { label: "Zero Waste Paris", url: "https://www.zerowasteparis.fr" },
        { label: "Surfrider Foundation", url: "https://surfrider.eu" },
      ]
    },
    {
      title: fr ? "Publier & Diffuser" : "Publish & Share",
      color: "blue" as const,
      icon: <Share2 size={24} />,
      links: [
        { label: "JeVeuxAider.gouv", url: "https://www.jeveuxaider.gouv.fr", badge: "Gov" },
        { label: "HelloAsso", url: "https://www.helloasso.com" },
        { label: "Eventbrite", url: "https://www.eventbrite.fr" },
        { label: "Meetup", url: "https://www.meetup.com" },
      ]
    },
    {
      title: fr ? "Mairies & Officiel" : "Official & City",
      color: "violet" as const,
      icon: <Building2 size={24} />,
      links: [
        { label: "Mairie de Paris", url: "https://www.paris.fr", badge: "75" },
        { label: "Nettoyages Participatifs", url: "https://www.paris.fr/Nettoyages-participatifs" },
        { label: "Demander du matériel", url: "#material", icon: <Smartphone size={16} /> },
        { label: "Annuaire des Mairies", url: "https://www.paris.fr/mairies" },
      ]
    },
    {
      title: fr ? "Outils & Exports" : "Tools & Exports",
      color: "rose" as const,
      icon: <FileText size={24} />,
      links: [
        { label: "Générer PDF Mission", url: "#export-pdf", badge: "PDF" },
        { label: "Export HelloAsso", url: "#export-helloasso", badge: "CSV" },
        { label: "Sync Calendrier", url: "#export-ics", badge: "ICS" },
        { label: "Kit Communication", url: "#kit", icon: <PlusCircle size={16} /> },
      ]
    }
  ];

  return (
    <section className="space-y-12 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="text-4xl font-black tracking-tighter text-white flex items-center gap-4"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Handshake size={32} />
            </div>
            <span>{fr ? "Ressources & Partenaires" : "Resources & Partners"}</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-white/40 font-medium max-w-xl text-lg leading-relaxed"
          >
            {fr 
              ? "Accédez aux outils et réseaux officiels pour amplifier vos actions de terrain."
              : "Access official tools and networks to amplify your field actions."
            }
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="relative group"
        >
          <input 
            type="text" 
            placeholder={fr ? "Rechercher une ressource..." : "Search resources..."}
            className="w-full md:w-80 rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-4 pl-12 text-sm font-bold text-white shadow-2xl backdrop-blur-xl transition-all focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none placeholder:text-white/20"
          />
          <Search size={20} className="absolute left-4 top-4 text-white/20 transition-colors group-focus-within:text-emerald-400" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {sections.map((section, idx) => (
          <ExternalHubCard key={idx} {...section} />
        ))}
      </div>
      
      <RubriqueCard 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        themeColor="emerald"
        withTopBar={false}
        className="p-10"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] -translate-y-1/2 translate-x-1/2 transition-opacity group-hover:opacity-100 opacity-50" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              Institutional Network
            </div>
            <h3 className="text-3xl font-black tracking-tight text-white mb-4">
              {fr ? "Vous êtes une association ?" : "Are you an association?"}
            </h3>
            <p className="text-white/40 font-medium max-w-lg text-lg">
              {fr 
                ? "Rejoignez le réseau CleanMyMap pour bénéficier d'une visibilité accrue et d'outils dédiés à l'impact environnemental."
                : "Join the CleanMyMap network to benefit from increased visibility and tools dedicated to environmental impact."
              }
            </p>
          </div>
          <CmmButton type="button" tone="primary" variant="pill" className="group/btn whitespace-nowrap px-10 py-5 font-black transition-all shadow-2xl shadow-emerald-500/40 active:scale-95 flex items-center gap-3">
            <span>{fr ? "Devenir Partenaire" : "Become Partner"}</span>
            <ArrowRight size={20} className="transition-transform group-hover/btn:translate-x-1" />
          </CmmButton>
        </div>
      </RubriqueCard>
    </section>
  );
}
