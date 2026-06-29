"use client";

import {
  BrowsePageHeader,
  MockProductCard,
} from "@/components/student/browse/mock-product-card";
import { FaqSection } from "@/components/student/browse/faq-section";
import { TestimonialsSection } from "@/components/student/browse/testimonials-section";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  StudentBrowseProvider,
  useStudentBrowseData,
} from "@/contexts/student-browse-context";

export function BrowseView() {
  return (
    <StudentBrowseProvider>
      <BrowseContent />
    </StudentBrowseProvider>
  );
}

function BrowseContent() {
  const { products, loading, error } = useStudentBrowseData();

  return (
    <ApiDataShell
      loading={loading}
      error={error}
      empty={!products.length}
      emptyMessage="No mocks are available for you to book right now. You may have already completed or enrolled in every active package."
    >
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <BrowsePageHeader />
          {products.map((product) => (
            <MockProductCard key={product.id} product={product} />
          ))}
          <TestimonialsSection />
          <FaqSection />
        </div>
      </div>
    </ApiDataShell>
  );
}
