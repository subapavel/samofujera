import { ImageResponse } from "next/og";

export const runtime = "edge";

const BRAND_COLOR = "#8B5CF6";
const BRAND_NAME = "Samo Fujera";
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface EntityData {
  title: string;
  imageUrl: string | null;
  panX: number;
  panY: number;
}

async function fetchProductData(slug: string): Promise<EntityData | null> {
  try {
    const res = await fetch(`${apiUrl}/api/catalog/products/${slug}`);
    if (!res.ok) return null;
    const { data } = await res.json();
    const firstImage = data.images?.[0];
    return {
      title: data.title,
      imageUrl: firstImage?.url || data.thumbnailUrl || null,
      panX: firstImage?.panX ?? 50,
      panY: firstImage?.panY ?? 50,
    };
  } catch {
    return null;
  }
}

async function fetchCategoryData(slug: string): Promise<EntityData | null> {
  try {
    const res = await fetch(`${apiUrl}/api/catalog/categories`);
    if (!res.ok) return null;
    const { data } = await res.json();
    const category = data.find((c: { slug: string }) => c.slug === slug);
    if (!category) return null;
    return {
      title: category.name,
      imageUrl: category.imageUrl || null,
      panX: 50,
      panY: 50,
    };
  } catch {
    return null;
  }
}

async function fetchPageData(slug: string): Promise<EntityData | null> {
  try {
    const res = await fetch(`${apiUrl}/api/pages/${slug}`);
    if (!res.ok) return null;
    const { data } = await res.json();
    return {
      title: data.ogTitle || data.title,
      imageUrl: data.ogImageUrl || null,
      panX: 50,
      panY: 50,
    };
  } catch {
    return null;
  }
}

async function fetchEntityData(
  entityType: string,
  slug: string
): Promise<EntityData | null> {
  switch (entityType) {
    case "product":
      return fetchProductData(slug);
    case "category":
      return fetchCategoryData(slug);
    case "page":
      return fetchPageData(slug);
    default:
      return null;
  }
}

function renderBrandedTemplate(title: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BRAND_COLOR,
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "900px",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          {BRAND_NAME}
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}

function renderImageTemplate(title: string, imageUrl: string, panX: number, panY: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
        }}
      >
        {/* Background image with pan offset */}
        <img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${panX}% ${panY}%`,
          }}
        />
        {/* Gradient overlay for text readability */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "60%",
            display: "flex",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)",
          }}
        />
        {/* Text content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            padding: "40px 60px",
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.2,
              maxWidth: "900px",
              wordBreak: "break-word",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.85)",
              marginTop: "12px",
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            {BRAND_NAME}
          </div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; slug: string }> }
) {
  try {
    const { entityType, slug } = await params;

    const validTypes = ["product", "category", "page"];
    if (!validTypes.includes(entityType)) {
      return renderBrandedTemplate(BRAND_NAME);
    }

    const entity = await fetchEntityData(entityType, slug);

    if (!entity) {
      return renderBrandedTemplate(BRAND_NAME);
    }

    if (entity.imageUrl) {
      return renderImageTemplate(
        entity.title,
        entity.imageUrl,
        entity.panX,
        entity.panY
      );
    }

    return renderBrandedTemplate(entity.title);
  } catch {
    return renderBrandedTemplate(BRAND_NAME);
  }
}
