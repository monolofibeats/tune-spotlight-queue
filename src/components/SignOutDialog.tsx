import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

interface SignOutDialogProps {
  variant?: 'icon' | 'full';
  onSignOut?: () => void;
}

export function SignOutDialog({ variant = 'icon', onSignOut }: SignOutDialogProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-sm">
            <LogOut className="w-4 h-4" />
            {t('nav.logout')}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-strong">
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to sign out of your account?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sign Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
