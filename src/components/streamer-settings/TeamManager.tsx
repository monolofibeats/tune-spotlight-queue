import { useState, useEffect } from 'react';
import { Users, Mail, Shield, Eye, Edit, Crown, Trash2, Loader2, UserPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';


interface TeamMember {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  invitation_status: string;
  invited_at: string;
  accepted_at: string | null;
  user_id: string | null;
}

interface TeamManagerProps {
  streamerId: string;
}

const roleConfig = {
  viewer: {
    label: 'Viewer',
    description: 'Can view the dashboard and queue, but cannot make changes',
    icon: Eye,
    color: 'text-blue-400',
  },
  editor: {
    label: 'Editor / Manager',
    description: 'Can manage submissions, update queue, and edit settings',
    icon: Edit,
    color: 'text-amber-400',
  },
  admin: {
    label: 'Administrator',
    description: 'Full access to all dashboard features including team management',
    icon: Crown,
    color: 'text-red-400',
  },
};

export function TeamManager({ streamerId }: TeamManagerProps) {
  const { t } = useLanguage();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');


  const fetchMembers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('streamer_team_members')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMembers(data as unknown as TeamMember[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [streamerId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          streamer_id: streamerId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invitation');
      }

      const result = response.data;
      if (result.error) {
        throw new Error(result.error);
      }

      toast({ title: 'Invitation sent! 📧', description: `${inviteEmail} has been invited as ${roleConfig[inviteRole].label}.` });
      setInviteEmail('');
      setInviteRole('viewer');
      fetchMembers();
    } catch (error: any) {
      toast({ title: 'Failed to send invitation', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleRemove = async (memberId: string, email: string) => {
    const { error } = await supabase
      .from('streamer_team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove team member.', variant: 'destructive' });
    } else {
      toast({ title: 'Member removed', description: `${email} has been removed from the team.` });
      fetchMembers();
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    const { error } = await supabase
      .from('streamer_team_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
    } else {
      toast({ title: 'Role updated', description: `Role changed to ${roleConfig[newRole].label}.` });
      fetchMembers();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="w-3 h-3 mr-1" /> {t('team.statusActive')}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Mail className="w-3 h-3 mr-1" /> {t('team.statusPending')}</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30"><X className="w-3 h-3 mr-1" /> {t('team.statusDeclined')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{t('team.inviteTitle')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('team.inviteDesc')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">{t('team.emailLabel')}</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('team.emailPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('team.roleLabel')}</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" /> {t('team.viewer')}
                  </span>
                </SelectItem>
                <SelectItem value="editor">
                  <span className="flex items-center gap-2">
                    <Edit className="w-4 h-4" /> {t('team.editor')}
                  </span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2">
                    <Crown className="w-4 h-4" /> {t('team.admin')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={isSending || !inviteEmail.trim()} className="gap-2">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {t('team.sendInvite')}
          </Button>
        </div>
      </div>

      {/* Roles Explanation */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{t('team.rolePermissions')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: 'viewer', icon: Eye, color: 'text-blue-400', label: t('team.viewer'), desc: t('team.viewerDesc') },
            { key: 'editor', icon: Edit, color: 'text-amber-400', label: t('team.editor'), desc: t('team.editorDesc') },
            { key: 'admin', icon: Crown, color: 'text-red-400', label: t('team.admin'), desc: t('team.adminDesc') },
          ] as const).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="bg-background/50 border border-border/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{t('team.membersTitle')}</h3>
          <Badge variant="outline" className="ml-auto">
            {members.length} {members.length !== 1 ? t('team.members') : t('team.member')}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>{t('team.noMembers')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const roleLabels: Record<string, string> = {
                viewer: t('team.viewer'),
                editor: t('team.editor'),
                admin: t('team.admin'),
              };
              const roleColors: Record<string, string> = {
                viewer: 'text-blue-400',
                editor: 'text-amber-400',
                admin: 'text-red-400',
              };
              const roleIcons: Record<string, typeof Eye> = {
                viewer: Eye,
                editor: Edit,
                admin: Crown,
              };
              const Icon = roleIcons[member.role] || Eye;
              return (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-background/50 border border-border/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-background border border-border/50">
                      <Icon className={`w-4 h-4 ${roleColors[member.role] || ''}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('team.invited')} {new Date(member.invited_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(member.invitation_status)}
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v as any)}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">{t('team.viewer')}</SelectItem>
                        <SelectItem value="editor">{t('team.editor')}</SelectItem>
                        <SelectItem value="admin">{t('team.admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(member.id, member.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
