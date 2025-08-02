import { cn } from "@/lib/utils";

interface HttpMethodProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  className?: string;
}

export function HttpMethod({ method, className }: HttpMethodProps) {
  return (
    <span className={cn("http-method", method.toLowerCase(), className)}>
      {method}
    </span>
  );
}
