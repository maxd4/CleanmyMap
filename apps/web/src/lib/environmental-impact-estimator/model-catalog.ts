import type { MultimodalCategory } from "./scientific-registry";

/**
 * Catalogue canonique des modèles d'IA pour l'estimateur personnel d'empreinte environnementale.
 *
 * Invariants majeurs :
 * 1. Séparation stricte de l'éditeur (publisher) et de l'hébergeur effectif (hoster).
 *    Ne JAMAIS déduire l'hébergeur de l'éditeur (ex: Llama est édité par Meta mais hébergé sur AWS/Together/local).
 * 2. Séparation stricte des axes : exécution cloud/locale, disponibilité des poids (open/propriétaire), opérateur.
 * 3. Les niveaux de raisonnement sont des tokens de raisonnement (reasoning tokens),
 *    pas des multiplicateurs énergétiques arbitraires.
 */

export type AiModelPublisher =
  | "OpenAI"
  | "Anthropic"
  | "Mistral AI"
  | "Meta"
  | "DeepSeek"
  | "Google"
  | "Alibaba"
  | "Other";

export type WeightsAvailability = "open_source" | "open_weights" | "proprietary";

export type ExecutionEnvironment = "cloud_api" | "local_device";

export type ArchitectureType = "dense" | "moe" | "unreleased_proprietary";

export type AiModelArchitecture = {
  readonly type: ArchitectureType;
  /** Nombre total de paramètres en milliards (Billion) si documenté, ou null */
  readonly totalParametersBillion: number | null;
  /** Nombre de paramètres actifs par token en milliards (Billion) si documenté, ou null */
  readonly activeParametersBillion: number | null;
  /** Indique si le modèle est un modèle de raisonnement (reasoning / thinking model) */
  readonly isReasoningModel: boolean;
};

export type AiModelHoster = {
  readonly id: string;
  readonly name: string;
  readonly defaultRegion?: string;
  readonly defaultPue?: number;
  readonly isSelfHosted?: boolean;
};

export type AiModelRecord = {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly publisher: AiModelPublisher;
  readonly supportedModalities: readonly MultimodalCategory[];
  readonly weightsAvailability: WeightsAvailability;
  readonly license: string;
  readonly architecture: AiModelArchitecture;
  readonly possibleHosters: readonly AiModelHoster[];
  readonly verifiableSources: readonly string[];
  readonly notes?: string;
};

export const STANDARD_HOSTERS = {
  OPENAI_DIRECT: {
    id: "openai",
    name: "OpenAI API",
    defaultRegion: "US",
    defaultPue: 1.15,
  },
  AZURE_OPENAI: {
    id: "azure",
    name: "Microsoft Azure",
    defaultRegion: "US",
    defaultPue: 1.18,
  },
  ANTHROPIC_DIRECT: {
    id: "anthropic",
    name: "Anthropic API",
    defaultRegion: "US",
    defaultPue: 1.15,
  },
  AWS_BEDROCK: {
    id: "aws_bedrock",
    name: "AWS Bedrock",
    defaultRegion: "US",
    defaultPue: 1.15,
  },
  GCP_VERTEX: {
    id: "gcp_vertex",
    name: "Google Cloud Vertex AI",
    defaultRegion: "US",
    defaultPue: 1.10,
  },
  MISTRAL_DIRECT: {
    id: "mistral_plateforme",
    name: "Mistral La Plateforme",
    defaultRegion: "FR",
    defaultPue: 1.15,
  },
  SCALEWAY: {
    id: "scaleway",
    name: "Scaleway Elements",
    defaultRegion: "FR",
    defaultPue: 1.15,
  },
  DEEPSEEK_DIRECT: {
    id: "deepseek",
    name: "DeepSeek API",
    defaultRegion: "UNKNOWN",
    defaultPue: 1.15,
  },
  TOGETHER_AI: {
    id: "together_ai",
    name: "Together AI",
    defaultRegion: "US",
    defaultPue: 1.15,
  },
  GROQ: {
    id: "groq",
    name: "Groq Cloud (LPU)",
    defaultRegion: "US",
    defaultPue: 1.15,
  },
  LOCAL_SELF_HOSTED: {
    id: "local_self_hosted",
    name: "Machine locale / Serveur privé",
    defaultRegion: "UNKNOWN",
    defaultPue: 1.0,
    isSelfHosted: true,
  },
} as const satisfies Record<string, AiModelHoster>;

export const AI_MODEL_CATALOG: readonly AiModelRecord[] = [
  // 1. OPENAI
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    version: "2024-08-06",
    publisher: "OpenAI",
    supportedModalities: ["text", "image", "audio"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: false,
    },
    possibleHosters: [STANDARD_HOSTERS.OPENAI_DIRECT, STANDARD_HOSTERS.AZURE_OPENAI],
    verifiableSources: [
      "https://openai.com/index/hello-gpt-4o/",
      "https://ecologits.ai",
    ],
    notes: "Modèle multimodal frontière d'OpenAI. Architecture exacte non publiée (statut ASSUMPTION/PROXY).",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    version: "2024-07-18",
    publisher: "OpenAI",
    supportedModalities: ["text", "image"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: false,
    },
    possibleHosters: [STANDARD_HOSTERS.OPENAI_DIRECT, STANDARD_HOSTERS.AZURE_OPENAI],
    verifiableSources: [
      "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/",
    ],
    notes: "Modèle compact optimisé pour le coût et la latence.",
  },
  {
    id: "openai/o1",
    name: "o1",
    version: "2024-12-17",
    publisher: "OpenAI",
    supportedModalities: ["text", "image"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: true,
    },
    possibleHosters: [STANDARD_HOSTERS.OPENAI_DIRECT, STANDARD_HOSTERS.AZURE_OPENAI],
    verifiableSources: [
      "https://openai.com/index/introducing-openai-o1/",
    ],
    notes: "Modèle de raisonnement. L'effort de réflexion est mesuré par les reasoning tokens générés.",
  },
  {
    id: "openai/o3-mini",
    name: "o3-mini",
    version: "2025-01-31",
    publisher: "OpenAI",
    supportedModalities: ["text"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: true,
    },
    possibleHosters: [STANDARD_HOSTERS.OPENAI_DIRECT, STANDARD_HOSTERS.AZURE_OPENAI],
    verifiableSources: [
      "https://openai.com/index/openai-o3-mini/",
    ],
    notes: "Modèle de raisonnement compact orienté code et sciences.",
  },

  // 2. ANTHROPIC
  {
    id: "anthropic/claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    version: "20241022",
    publisher: "Anthropic",
    supportedModalities: ["text", "image"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.ANTHROPIC_DIRECT,
      STANDARD_HOSTERS.AWS_BEDROCK,
      STANDARD_HOSTERS.GCP_VERTEX,
    ],
    verifiableSources: [
      "https://www.anthropic.com/news/claude-3-5-sonnet",
    ],
    notes: "Modèle frontière Anthropic. Hébergeurs possibles : Anthropic, AWS Bedrock ou GCP Vertex AI.",
  },
  {
    id: "anthropic/claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    version: "20241022",
    publisher: "Anthropic",
    supportedModalities: ["text"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.ANTHROPIC_DIRECT,
      STANDARD_HOSTERS.AWS_BEDROCK,
      STANDARD_HOSTERS.GCP_VERTEX,
    ],
    verifiableSources: [
      "https://www.anthropic.com/news/claude-3-5-haiku",
    ],
  },

  // 3. MISTRAL AI
  {
    id: "mistralai/mistral-large-2407",
    name: "Mistral Large 2",
    version: "2407",
    publisher: "Mistral AI",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Mistral Research & Commercial License",
    architecture: {
      type: "dense",
      totalParametersBillion: 123,
      activeParametersBillion: 123,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.MISTRAL_DIRECT,
      STANDARD_HOSTERS.AZURE_OPENAI,
      STANDARD_HOSTERS.SCALEWAY,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://mistral.ai/news/mistral-large-2407/",
    ],
    notes: "123 milliards de paramètres denses.",
  },
  {
    id: "mistralai/mixtral-8x22b-instruct",
    name: "Mixtral 8x22B",
    version: "v0.1",
    publisher: "Mistral AI",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Apache-2.0",
    architecture: {
      type: "moe",
      totalParametersBillion: 141,
      activeParametersBillion: 39,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.MISTRAL_DIRECT,
      STANDARD_HOSTERS.SCALEWAY,
      STANDARD_HOSTERS.TOGETHER_AI,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://mistral.ai/news/mixtral-8x22b/",
    ],
    notes: "Architecture MoE 8x22B : 141B paramètres au total, 39B actifs par token.",
  },
  {
    id: "mistralai/mistral-small-2409",
    name: "Mistral Small",
    version: "2409",
    publisher: "Mistral AI",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Apache-2.0",
    architecture: {
      type: "dense",
      totalParametersBillion: 22,
      activeParametersBillion: 22,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.MISTRAL_DIRECT,
      STANDARD_HOSTERS.SCALEWAY,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://mistral.ai/news/mistral-small-2409/",
    ],
  },

  // 4. META
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    version: "3.1",
    publisher: "Meta",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Llama 3.1 Community License",
    architecture: {
      type: "dense",
      totalParametersBillion: 8,
      activeParametersBillion: 8,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.AWS_BEDROCK,
      STANDARD_HOSTERS.TOGETHER_AI,
      STANDARD_HOSTERS.GROQ,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://ai.meta.com/blog/meta-llama-3-1/",
    ],
    notes: "Modèle léger de 8B paramètres, déployable localement ou dans le cloud.",
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    version: "3.1",
    publisher: "Meta",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Llama 3.1 Community License",
    architecture: {
      type: "dense",
      totalParametersBillion: 70,
      activeParametersBillion: 70,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.AWS_BEDROCK,
      STANDARD_HOSTERS.AZURE_OPENAI,
      STANDARD_HOSTERS.TOGETHER_AI,
      STANDARD_HOSTERS.GROQ,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://ai.meta.com/blog/meta-llama-3-1/",
    ],
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B Instruct",
    version: "3.1",
    publisher: "Meta",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Llama 3.1 Community License",
    architecture: {
      type: "dense",
      totalParametersBillion: 405,
      activeParametersBillion: 405,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.AWS_BEDROCK,
      STANDARD_HOSTERS.AZURE_OPENAI,
      STANDARD_HOSTERS.TOGETHER_AI,
    ],
    verifiableSources: [
      "https://ai.meta.com/blog/meta-llama-3-1/",
    ],
    notes: "Modèle phare ouvert de 405 milliards de paramètres denses.",
  },

  // 5. DEEPSEEK
  {
    id: "deepseek-ai/deepseek-v3",
    name: "DeepSeek-V3",
    version: "2024-12",
    publisher: "DeepSeek",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "MIT",
    architecture: {
      type: "moe",
      totalParametersBillion: 671,
      activeParametersBillion: 37,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.DEEPSEEK_DIRECT,
      STANDARD_HOSTERS.TOGETHER_AI,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://github.com/deepseek-ai/DeepSeek-V3",
    ],
    notes: "Architecture MoE : 671B au total, 37B actifs par token (Multi-head Latent Attention).",
  },
  {
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek-R1",
    version: "2025-01",
    publisher: "DeepSeek",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "MIT",
    architecture: {
      type: "moe",
      totalParametersBillion: 671,
      activeParametersBillion: 37,
      isReasoningModel: true,
    },
    possibleHosters: [
      STANDARD_HOSTERS.DEEPSEEK_DIRECT,
      STANDARD_HOSTERS.TOGETHER_AI,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://github.com/deepseek-ai/DeepSeek-R1",
    ],
    notes: "Modèle de raisonnement open-weights sous licence MIT. Génère des tokens de réflexion.",
  },

  // 6. GOOGLE
  {
    id: "google/gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    version: "002",
    publisher: "Google",
    supportedModalities: ["text", "image", "audio", "video"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: false,
    },
    possibleHosters: [STANDARD_HOSTERS.GCP_VERTEX],
    verifiableSources: [
      "https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/",
    ],
    notes: "Modèle multimodal natif à très long contexte (jusqu'à 2 millions de tokens).",
  },
  {
    id: "google/gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    version: "002",
    publisher: "Google",
    supportedModalities: ["text", "image", "audio", "video"],
    weightsAvailability: "proprietary",
    license: "Proprietary Commercial",
    architecture: {
      type: "unreleased_proprietary",
      totalParametersBillion: null,
      activeParametersBillion: null,
      isReasoningModel: false,
    },
    possibleHosters: [STANDARD_HOSTERS.GCP_VERTEX],
    verifiableSources: [
      "https://deepmind.google/technologies/gemini/flash/",
    ],
    notes: "Modèle haute vitesse et haute efficacité énergétique.",
  },

  // 7. QWEN (ALIBABA)
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    version: "2.5",
    publisher: "Alibaba",
    supportedModalities: ["text"],
    weightsAvailability: "open_weights",
    license: "Apache-2.0",
    architecture: {
      type: "dense",
      totalParametersBillion: 72,
      activeParametersBillion: 72,
      isReasoningModel: false,
    },
    possibleHosters: [
      STANDARD_HOSTERS.TOGETHER_AI,
      STANDARD_HOSTERS.LOCAL_SELF_HOSTED,
    ],
    verifiableSources: [
      "https://qwenlm.github.io/blog/qwen2.5/",
    ],
  },
] as const;

/**
 * Recherche un modèle par son identifiant exact ou un alias normalisé.
 */
export function findAiModel(modelId: string | null | undefined): AiModelRecord | undefined {
  if (!modelId) return undefined;
  const normalized = modelId.trim().toLowerCase();

  return AI_MODEL_CATALOG.find((m) => {
    if (m.id.toLowerCase() === normalized) return true;
    if (m.name.toLowerCase() === normalized) return true;
    // Correspondance suffixe (ex: 'gpt-4o' pour 'openai/gpt-4o')
    if (m.id.toLowerCase().endsWith(`/${normalized}`)) return true;
    return false;
  });
}

/**
 * Recherche stricte : renvoie le modèle ou lance une exception explicite.
 */
export function requireAiModel(modelId: string): AiModelRecord {
  const model = findAiModel(modelId);
  if (!model) {
    throw new Error(
      `Modèle d'IA introuvable dans le catalogue canonique : "${modelId}". Vérifiez l'identifiant ou fournissez des paramètres d'architecture personnalisés.`,
    );
  }
  return model;
}

/**
 * Filtre les modèles du catalogue selon des critères objectifs.
 */
export function listAiModels(filter?: {
  publisher?: AiModelPublisher;
  weightsAvailability?: WeightsAvailability;
  modality?: MultimodalCategory;
  isReasoningModel?: boolean;
}): readonly AiModelRecord[] {
  return AI_MODEL_CATALOG.filter((model) => {
    if (filter?.publisher && model.publisher !== filter.publisher) return false;
    if (filter?.weightsAvailability && model.weightsAvailability !== filter.weightsAvailability) {
      return false;
    }
    if (filter?.modality && !model.supportedModalities.includes(filter.modality)) {
      return false;
    }
    if (
      typeof filter?.isReasoningModel === "boolean" &&
      model.architecture.isReasoningModel !== filter.isReasoningModel
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Résout l'hébergeur pour un modèle sans jamais déduire l'hébergeur effectif de l'éditeur.
 * Si aucun hébergeur n'est explicitement spécifié, renvoie un statut non ambigu "unknown_operator".
 */
export function resolveHosterForModel(
  model: AiModelRecord | undefined,
  hosterId?: string | null,
): AiModelHoster {
  if (!hosterId || hosterId.trim() === "" || hosterId.toLowerCase() === "unknown") {
    return {
      id: "unknown_operator",
      name: "Opérateur cloud / hébergeur non déclaré",
      defaultRegion: "UNKNOWN",
      defaultPue: 1.15,
      isSelfHosted: false,
    };
  }

  const normalized = hosterId.trim().toLowerCase();

  // Recherche dans les hébergeurs possibles déclarés du modèle
  const declaredMatch = model?.possibleHosters.find(
    (h) => h.id.toLowerCase() === normalized || h.name.toLowerCase() === normalized,
  );
  if (declaredMatch) return declaredMatch;

  // Recherche dans les hébergeurs standards
  const standardMatch = Object.values(STANDARD_HOSTERS).find(
    (h) => h.id.toLowerCase() === normalized || h.name.toLowerCase() === normalized,
  );
  if (standardMatch) return standardMatch;

  // Hébergeur personnalisé déclaré par l'utilisateur
  return {
    id: normalized,
    name: hosterId.trim(),
    defaultRegion: "UNKNOWN",
    defaultPue: 1.15,
    isSelfHosted: normalized.includes("local") || normalized.includes("self"),
  };
}
