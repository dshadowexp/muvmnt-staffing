export default function QuizPage({ params }: { params: { quizId: string } }) {
  const { quizId } = params;
  return <div>QuizPage {quizId}</div>;
}