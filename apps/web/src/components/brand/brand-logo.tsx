import Image, { type ImageProps } from "next/image";
import {
  BRAND_ASSET_DIMENSIONS,
  BRAND_ASSET_PATHS,
  type BrandLogoVariant,
} from "./brand-assets";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  alt?: string;
  className?: string;
  priority?: ImageProps["priority"];
  sizes?: ImageProps["sizes"];
};

export function BrandLogo({
  variant = "compact",
  alt = "CleanMyMap",
  className,
  priority,
  sizes,
}: BrandLogoProps) {
  return (
    <Image
      src={BRAND_ASSET_PATHS[variant]}
      alt={alt}
      width={BRAND_ASSET_DIMENSIONS[variant].width}
      height={BRAND_ASSET_DIMENSIONS[variant].height}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}
