"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { buildContactMailtoHref } from "@/lib/contact/contact-request-mail";

export type RequestType =
  "access" | "rectification" | "erasure" | "portability" | "other";
export type RequestMode = "automatic" | "manual";
type RequestStatus = "idle" | "sending" | "success" | "draft" | "error";
export type RequestFieldErrors = Partial<Record<"email" | "message", string>>;

const REQUEST_TYPE_LABELS: Record<RequestType, { fr: string; en: string }> = {
  access: {
    fr: "Droit d'accès (obtenir mes données)",
    en: "Right of access",
  },
  rectification: {
    fr: "Droit de rectification (corriger mes données)",
    en: "Right to rectification",
  },
  erasure: {
    fr: "Droit à l'effacement (supprimer mes données)",
    en: "Right to erasure",
  },
  portability: {
    fr: "Droit à la portabilité (exporter mes données)",
    en: "Right to portability",
  },
  other: { fr: "Autre demande RGPD", en: "Other GDPR request" },
};

import {
  RgpdFormBody,
  RgpdRequestFooter,
  RgpdSubmissionStatus,
} from "./rgpd-request-form.parts";

export function RgpdRequestForm() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const [requestType, setRequestType] = useState<RequestType>("erasure");
  const [deliveryMode, setDeliveryMode] = useState<RequestMode>("automatic");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submittedAt, setSubmittedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RequestFieldErrors>({});

  const requestTypeLabels = REQUEST_TYPE_LABELS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !message) {
      setFieldErrors({
        ...(email ? {} : { email: "Indiquez votre adresse email de contact." }),
        ...(message ? {} : { message: "Précisez votre demande." }),
      });
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setStatus("sending");
    setErrorMessage("");
    setFieldErrors({});

    const normalizedEmail = email.trim();
    const normalizedMessage = message.trim();
    const requestLabel = requestTypeLabels[requestType].fr;

    if (deliveryMode === "manual") {
      const mailtoLink = buildContactMailtoHref({
        to: contactEmail,
        requestTypeLabel: requestLabel,
        email: normalizedEmail,
        message: normalizedMessage,
        dateLabel: new Date().toLocaleString("fr-FR"),
      });

      setStatus("draft");
      window.location.href = mailtoLink;
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestType,
          email: normalizedEmail,
          message: normalizedMessage,
          honeypot,
          submittedAt,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        details?: Record<string, string[]>;
        retryAfterSeconds?: number;
      } | null;

      if (!response.ok) {
        const details = payload?.details;
        const fieldErrors = details
          ? Object.values(details)
              .flatMap((value) => value ?? [])
              .filter(
                (value): value is string =>
                  typeof value === "string" && value.length > 0,
              )
          : [];
        setFieldErrors({
          email: details?.email?.[0],
          message: details?.message?.[0],
        });
        setStatus("error");
        setErrorMessage(
          fieldErrors[0] ||
            payload?.error ||
            "Impossible d'envoyer votre demande pour le moment.",
        );
        return;
      }

      setStatus("success");
      setEmail("");
      setMessage("");
      setFieldErrors({});
      setHoneypot("");
      setSubmittedAt(Date.now());
    } catch {
      setStatus("error");
      setErrorMessage(
        "Erreur réseau. Vérifiez votre connexion puis réessayez.",
      );
    }
  };

  if (status === "success" || status === "draft") {
    return (
      <RgpdSubmissionStatus
        mode={status}
        onReset={() => {
          setStatus("idle");
          setErrorMessage("");
          if (status === "success") setSubmittedAt(Date.now());
        }}
      />
    );
  }

  return (
    <motion.form
      initial={{ opacity: 1, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="group relative space-y-6 rounded-[3rem] border border-slate-200/70 bg-white/88 p-10 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.38)] backdrop-blur-2xl"
    >
      <RgpdFormBody
        deliveryMode={deliveryMode}
        requestType={requestType}
        requestTypeLabels={requestTypeLabels}
        email={email}
        message={message}
        honeypot={honeypot}
        fieldErrors={fieldErrors}
        setDeliveryMode={setDeliveryMode}
        setRequestType={setRequestType}
        setEmail={setEmail}
        setMessage={setMessage}
        setHoneypot={setHoneypot}
        setFieldErrors={setFieldErrors}
        errorMessage={errorMessage}
      />

      <RgpdRequestFooter
        fr={fr}
        sending={status === "sending"}
        deliveryMode={deliveryMode}
      />
    </motion.form>
  );
}
