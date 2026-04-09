import { PLAN_LIMIT_MESSAGE } from "@/components/error-toast";
import { getJobInfo } from "@/features/requests/dal/queries";
import { canRunResumeAnalysis } from "@/features/resume-analysis/permissions";
import { analyzeResumeForJob } from "@/services/ai/resumes/ai";
import { getCurrentUser } from "@/services/firebase/lib/getCurrentUser";

export async function POST(req: Request) {
    const { user } = await getCurrentUser();

    if (user == null) {
        return new Response("You are not logged in", { status: 401 });
    }

    const formData = await req.formData();
    const resumeFile = formData.get("resumeFile") as File;
    const jobInfoId = formData.get("jobInfoId") as string;

    if (!resumeFile || !jobInfoId) {
        return new Response("Invalid request", { status: 400 })
    }

    if (resumeFile.size > 10 * 1024 * 1024) {
        return new Response("File size exceeds 10MB limit", { status: 400 });
    }

    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ];

    if (!allowedTypes.includes(resumeFile.type)) {
        return new Response("Please upload a PDF, Word document, or text file", {
            status: 400,
        });
    }

    const { error, message, data: jobInfo } = await getJobInfo(jobInfoId);
    if (error || jobInfo == null) {
        return new Response(message || "Job not found", { status: 404 });
    }

    if (!(await canRunResumeAnalysis())) {
        return new Response(PLAN_LIMIT_MESSAGE, { status: 403 });
    }
    
    const res = await analyzeResumeForJob({
        resumeFile,
        jobInfo,
    });

    return res.toTextStreamResponse();
}