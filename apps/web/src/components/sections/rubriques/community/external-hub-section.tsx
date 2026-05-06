"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { 
  ExternalLink, 
  MapPin, 
  Calendar, 
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
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorMap[color]} shadow-sm`}>
          {icon}
        </div>
        <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
      </div>
      
      <div className="grid gap-2">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center justify-between rounded-2xl border border-slate-50 bg-slate-50/50 px-4 py-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              {link.icon || <ExternalLink size={14} className="text-slate-400" />}
              <span className="text-sm font-bold text-slate-700">{link.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {link.badge && (
                <span className="rounded-full bg-slate-200/50 px-2 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {link.badge}
                </span>
              )}
              <ArrowRight size={14} className="translate-x-0 text-slate-300 transition-transform group-hover/link:translate-x-1 group-hover/link:text-slate-600" />
            </div>
          </a>
        ))}
      </div>
    </motion.div>
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
        { label: "Annuaire CleanMyMap", url: "/partners/network", badge: "Live", icon: <MapPin size={14} /> },
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
        { label: "Demander du matériel", url: "#material", icon: <Smartphone size={14} /> },
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
        { label: "Kit Communication", url: "#kit", icon: <PlusCircle size={14} /> },
      ]
    }
  ];

  return (
    <section className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <Handshake size={32} className="text-emerald-600" />
            {fr ? "Ressources & Partenaires" : "Resources & Partners"}
          </h2>
          <p className="mt-2 text-slate-500 font-medium max-w-xl">
            {fr 
              ? "Accédez aux outils et réseaux officiels pour amplifier vos actions de terrain."
              : "Access official tools and networks to amplify your field actions."
            }
          </p>
        </div>
        
        <div className="relative group">
          <input 
            type="text" 
            placeholder={fr ? "Rechercher une ressource..." : "Search resources..."}
            className="w-full md:w-64 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm font-medium shadow-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none"
          />
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
        {sections.map((section, idx) => (
          <ExternalHubCard key={idx} {...section} />
        ))}
      </div>
      
      <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-black tracking-tight mb-2">
              {fr ? "Vous êtes une association ?" : "Are you an association?"}
            </h3>
            <p className="text-slate-400 font-medium max-w-md">
              {fr 
                ? "Rejoignez le réseau CleanMyMap pour bénéficier d'une visibilité accrue et d'outils dédiés."
                : "Join the CleanMyMap network to benefit from increased visibility and dedicated tools."
              }
            </p>
          </div>
          <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/25 active:scale-95">
            {fr ? "Devenir Partenaire" : "Become Partner"}
          </button>
        </div>
      </div>
    </section>
  );
}
