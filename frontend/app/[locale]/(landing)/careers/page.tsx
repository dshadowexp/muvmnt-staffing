import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Muvmnt Staffing Inc.",
  description: "Careers at Muvmnt Staffing Inc.",
  keywords: [
    "careers",
    "Muvmnt Staffing Inc.",
    "job openings",
    "employment opportunities",
    "career opportunities",
  ],
};

interface JobOpening {
  title: string;
  location: string;
  url: string;
}

interface JobCategory {
  category: string;
  openings: JobOpening[];
}

const JOBS: JobCategory[] = [
    {
      category: "Engineering",
      openings: [
        {
          title: "Frontend Developer",
          location: "Remote",
          url: "#",
        },
        {
          title: "UI/UX Designer",
          location: "San Francisco",
          url: "#",
        },
      ],
    },
    {
      category: "Design",
      openings: [
        {
          title: "Visual Designer",
          location: "Remote",
          url: "#",
        },
      ],
    },
    {
      category: "Marketing",
      openings: [
        {
          title: "Marketing Manager",
          location: "Remote",
          url: "#",
        },
      ],
    },
];

export default function CareersPage() {
  return (
    <div>
      <section className={cn("py-32", '')}>
      <div className="container mx-auto">
        <h2 className="text-3xl font-medium md:text-4xl">Careers</h2>
        <div className="mt-6 flex flex-col gap-16 md:mt-14">
          {JOBS.map((jobCategory) => (
            <div key={jobCategory.category} className="grid">
              <h2 className="border-b pb-4 text-xl font-bold">
                {jobCategory.category}
              </h2>
              {jobCategory.openings.map((job) => (
                <div
                  key={job.title}
                  className="flex items-center justify-between border-b py-4"
                >
                  <div>
                    <a href={job.url} className="font-semibold hover:underline">
                      {job.title}
                    </a>
                    <p className="text-sm text-muted-foreground">
                      {job.location}
                    </p>
                  </div>
                  <a href={job.url} className="hover:text-muted-foreground">
                    <ArrowRight className="size-4" />
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
    </div>
  );
}