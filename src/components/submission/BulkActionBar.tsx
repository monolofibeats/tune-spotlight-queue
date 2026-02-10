import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trash2, X, CheckSquare, Square, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  isTrashView?: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkStatusChange: (status: string) => Promise<void>;
  onBulkDelete: (permanent?: boolean) => Promise<void>;
  onBulkRestore?: () => Promise<void>;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  isTrashView = false,
  onSelectAll,
  onDeselectAll,
  onBulkStatusChange,
  onBulkDelete,
  onBulkRestore,
}: BulkActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const allSelected = selectedCount === totalCount && totalCount > 0;

  const handleAction = async (action: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="sticky bottom-4 z-30 mx-auto max-w-xl"
        >
          <div className="glass-strong rounded-xl border border-primary/30 shadow-lg shadow-primary/10 px-4 py-3 flex items-center gap-3 flex-wrap">
            {/* Selection info */}
            <span className="text-sm font-medium whitespace-nowrap">
              {selectedCount} selected
            </span>

            {/* Select / Deselect all */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={allSelected ? onDeselectAll : onSelectAll}
            >
              {allSelected ? (
                <>
                  <Square className="w-3 h-3" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-3 h-3" />
                  Select All ({totalCount})
                </>
              )}
            </Button>

            <div className="h-4 w-px bg-border" />

            {/* Actions */}
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : isTrashView ? (
              <>
                {onBulkRestore && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleAction(() => onBulkRestore())}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Forever
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleAction(() => onBulkStatusChange('reviewed'))}
                >
                  <CheckCircle className="w-3 h-3" />
                  Done
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleAction(() => onBulkStatusChange('skipped'))}
                >
                  <XCircle className="w-3 h-3" />
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleAction(() => onBulkStatusChange('pending'))}
                >
                  Pending
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-3 h-3" />
                  Trash
                </Button>
              </>
            )}

            <div className="h-4 w-px bg-border" />

            {/* Cancel */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={onDeselectAll}
            >
              <X className="w-3 h-3" />
              Cancel
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrashView ? 'Permanently delete?' : 'Move to Trash?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrashView
                ? `This will permanently delete ${selectedCount} submission${selectedCount > 1 ? 's' : ''}. This cannot be undone.`
                : `This will move ${selectedCount} submission${selectedCount > 1 ? 's' : ''} to the trash. You can restore them within 7 days.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleAction(() => onBulkDelete(isTrashView))}
            >
              {isTrashView ? 'Delete Forever' : 'Move to Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
