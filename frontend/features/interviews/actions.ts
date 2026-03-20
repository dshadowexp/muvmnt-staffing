export async function createInterview({
    jobInfoId,
}: {
    jobInfoId: string
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
    return { error: false, id: "123" };
}

export async function updateInterview(
    id: string,
    data: {
      humeChatId?: string
      duration?: string
    }
) {
    return { error: false, message: "Interview updated successfully" };
}

export async function generateInterviewFeedback(interviewId: string) {
    return { error: false, message: "Interview feedback generated successfully" };
}

export async function getInterview(id: string) {
    return { error: false, message: "Interview fetched successfully", data: { id: "123" } };
}