import { redirect } from 'next/navigation';
import { isToolId, ToolId, TOOLS } from '@/lib/tools';
import AppMain from '@/components/AppMain';

// Statically generate the routes for all registered tools for sub-millisecond initial load.
export function generateStaticParams() {
  return TOOLS.map(tool => ({
    toolId: tool.id,
  }));
}

export default async function ToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;

  if (!isToolId(toolId)) {
    redirect('/');
  }

  return <AppMain initialActiveTool={toolId} />;
}
