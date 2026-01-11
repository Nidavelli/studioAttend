import { Card, CardContent } from "@/components/ui/card";

export function AttendanceSheet({ content }: { content: string }) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="p-6">
        <pre className="whitespace-pre-wrap font-code text-sm text-foreground">
          {content}
        </pre>
      </CardContent>
    </Card>
  );
}
