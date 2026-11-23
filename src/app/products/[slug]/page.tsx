import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductReviews } from "@/components/product/ProductReviews";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE } from "@/data/site";
import { loadProducts, loadProductById, getRelatedProducts } from "@/lib/catalog";
import { productImageUrl } from "@/lib/images";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProductById(slug);
  if (!result.ok) {
    return { title: "Product not found" };
  }
  const product = result.product;

  // Backend-managed SEO copy wins; without it the page falls back to the
  // catalogue's own name and summary. A custom metaTitle is used verbatim
  // (merchants may include the brand themselves) so the layout's title
  // template is only applied to the generated fallback.
  const metaTitle = product.metaTitle?.trim();
  const description = product.metaDescription?.trim() || product.summary;
  const keywords = product.metaKeywords
    ?.split(/[\n,]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const imageAlt = product.imageAlt?.trim() || product.name;
  const socialTitle = metaTitle || `${product.name} | ${SITE.name}`;
  const socialImage = {
    url: productImageUrl(product, 0, { width: 1200 }),
    width: 1200,
    height: 1600,
    alt: imageAlt,
  };

  return {
    title: metaTitle ? { absolute: metaTitle } : product.name,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: { canonical: `${SITE.url}/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: socialTitle,
      description,
      url: `${SITE.url}/products/${product.slug}`,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage],
    },
  };
}

/**
 * Product structured data (schema.org/Product).
 *
 * Emitted so search engines can surface price, availability and rating as
 * rich results, and to keep the listing consistent with the visible page.
 */
function ProductJsonLd({
  name,
  description,
  slug,
  image,
  price,
  rating,
  reviewCount,
  availability,
}: {
  name: string;
  description: string;
  slug: string;
  image: string;
  price: number;
  rating: number;
  reviewCount: number;
  availability: "InStock" | "OutOfStock";
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    brand: { "@type": "Brand", name: SITE.name },
    sku: slug,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/products/${slug}`,
      priceCurrency: "INR",
      price,
      availability: `https://schema.org/${availability}`,
      seller: { "@type": "Organization", name: SITE.name },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
    },
  };

  return (
    <script
      type="application/ld+json"
      // Product name/description come from the admin, so escape "<" — a value
      // containing "</script>" would otherwise end this tag early (stored XSS).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}


export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await loadProductById(slug);
  if (!result.ok) notFound();
  const product = result.product;

  const related = getRelatedProducts(product, await loadProducts().then((r) => (r.ok ? r.products : [])), 4);

  return (
    <>
      <ProductJsonLd
        name={product.name}
        description={product.description}
        slug={product.slug}
        image={productImageUrl(product, 0, { width: 1200 })}
        price={product.price}
        rating={product.rating}
        reviewCount={product.reviewCount}
        availability="InStock"
      />

      {/* Breadcrumb */}
      <div className="border-b border-line bg-surface">
        <Container>
          <nav aria-label="Breadcrumb" className="py-4">
            <ol className="ap-eyebrow flex flex-wrap items-center gap-2 text-ink/60">
              <li>
                <Link href="/" className="transition-colors hover:text-burnt">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/${product.category}`}
                  className="transition-colors hover:text-burnt"
                >
                  {product.category}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink" aria-current="page">
                {product.name}
              </li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* Gallery + buy box — a 60:40 editorial split: the photography leads,
          the buy box holds the decisions. */}
      <Container>
        <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16 lg:py-16">
          <ProductGallery
            photoSet={product.photoSet}
            imageUrls={product.images}
            productName={product.name}
            imageAlt={product.imageAlt}
          />
          <div className="lg:pt-1" data-qa="info">
            <ProductInfo product={product} />
          </div>
        </div>
      </Container>

      {/* Reviews — mock data, frontend only */}
      <Container>
        <ProductReviews product={product} />
      </Container>

      {/* Related */}
      {related.length > 0 && (
        <Container className="py-16 sm:py-24">
          <SectionHeading
            eyebrow="You may also like"
            title="Pairs well with"
            description="Pieces chosen because they share this piece's fabric, colour or occasion."
          />
          <div className="mt-10">
            <ProductGrid products={related} showQuickAdd showRating />
          </div>
        </Container>
      )}
    </>
  );
}

