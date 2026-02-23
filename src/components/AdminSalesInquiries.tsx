import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Check, Send, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SalesInquiry {
  id: string;
  email: string;
  status: string;
  message: string | null;
  admin_notes: string | null;
  created_at: string;
}

export function AdminSalesInquiries() {
  const [inquiries, setInquiries] = useState<SalesInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    const { data, error } = await supabase
      .from('sales_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setInquiries(data as SalesInquiry[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const markDone = async (id: string) => {
    const { error } = await supabase
      .from('sales_inquiries')
      .update({ status: 'done', processed_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (!error) {
      toast.success('Marked as done');
      fetchInquiries();
    }
  };

  const sendInfoEmail = async (inquiry: SalesInquiry) => {
    setSendingId(inquiry.id);
    try {
      const { error } = await supabase.functions.invoke('send-sales-info', {
        body: { email: inquiry.email, inquiryId: inquiry.id },
      });
      if (error) throw error;
      toast.success('Info email sent');
      fetchInquiries();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingId(null);
    }
  };

  const deleteInquiry = async (id: string) => {
    const { error } = await supabase.from('sales_inquiries').delete().eq('id', id);
    if (!error) {
      toast.success('Deleted');
      fetchInquiries();
    }
  };

  const pending = inquiries.filter(i => i.status === 'pending');
  const processed = inquiries.filter(i => i.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Mail className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-display font-bold">Sales Inquiries</h2>
        <Badge variant="secondary" className="text-xs">{pending.length} pending</Badge>
      </div>

      {inquiries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No sales inquiries yet</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending</h3>
          {pending.map(inquiry => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onMarkDone={markDone}
              onSendEmail={sendInfoEmail}
              onDelete={deleteInquiry}
              isSending={sendingId === inquiry.id}
            />
          ))}
        </div>
      )}

      {processed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Processed</h3>
          {processed.map(inquiry => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onMarkDone={markDone}
              onSendEmail={sendInfoEmail}
              onDelete={deleteInquiry}
              isSending={sendingId === inquiry.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({
  inquiry,
  onMarkDone,
  onSendEmail,
  onDelete,
  isSending,
}: {
  inquiry: SalesInquiry;
  onMarkDone: (id: string) => void;
  onSendEmail: (inquiry: SalesInquiry) => void;
  onDelete: (id: string) => void;
  isSending: boolean;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{inquiry.email}</span>
              <Badge
                variant={inquiry.status === 'pending' ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {inquiry.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(inquiry.created_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {inquiry.message && (
              <p className="text-xs text-foreground/70 mt-1 italic">"{inquiry.message}"</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {inquiry.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => onMarkDone(inquiry.id)}
                >
                  <Check className="w-3.5 h-3.5" />
                  Done
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => onSendEmail(inquiry)}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send Info
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(inquiry.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
