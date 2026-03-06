import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trash2, X, CheckSquare, Square, Loader2, RotateCcw, Pin, ChevronRight } from 'lucide-react';
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
import { useLanguage } from '@/hooks/useLanguage';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  isTrashView?: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkStatusChange: (status: string) => Promise<void>;
  onBulkDelete: (permanent?: boolean) => Promise<void>;
  onBulkRestore?: () => Promise<void>;
  onBulkMarkPriority?: (isPriority: boolean) => Promise<void>;
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
  onBulkMarkPriority,
}: BulkActionBarProps) {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const allSelected = selectedCount === totalCount && totalCount > 0;

  const handleAction = async (action: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
      setExpanded(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999]"
        >
          <AnimatePresence mode="wait">
            {!expanded ? (
              <motion.div
                key="compact"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-background shadow-md px-3 py-1.5"
              >
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {selectedCount}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 px-2 rounded-full"
                  onClick={allSelected ? onDeselectAll : onSelectAll}
                >
                  {allSelected ? (
                    <><Square className="w-3 h-3" />{t('bulk.deselectAll')}</>
                  ) : (
                    <><CheckSquare className="w-3 h-3" />All ({totalCount})</>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-[11px] gap-0.5 px-2.5 rounded-full"
                  onClick={() => setExpanded(true)}
                >
                  Actions <ChevronRight className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full text-muted-foreground"
                  onClick={onDeselectAll}
                >
                  <X className="w-3 h-3" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-background shadow-lg px-3 py-2 flex-wrap max-w-[90vw]"
              >
                <span className="text-xs font-semibold text-primary mr-1">
                  {selectedCount} {t('bulk.selected')}
                </span>

                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : isTrashView ? (
                  <>
                    {onBulkRestore && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => handleAction(() => onBulkRestore())}>
                        <RotateCcw className="w-3 h-3" />{t('bulk.restore')}
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="w-3 h-3" />{t('bulk.deleteForever')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="default" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => handleAction(() => onBulkStatusChange('reviewed'))}>
                      <CheckCircle className="w-3 h-3" />{t('bulk.done')}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => handleAction(() => onBulkStatusChange('skipped'))}>
                      <XCircle className="w-3 h-3" />{t('bulk.skip')}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => handleAction(() => onBulkStatusChange('pending'))}>
                      {t('bulk.pending')}
                    </Button>
                    {onBulkMarkPriority && (
                      <Button variant="outline" size="sm"
                        className="h-7 text-xs gap-1 text-amber-500 hover:text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => handleAction(() => onBulkMarkPriority(true))}>
                        <Pin className="w-3 h-3" />Priority
                      </Button>
                    )}
                    <Button variant="ghost" size="sm"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="w-3 h-3" />{t('bulk.trash')}
                    </Button>
                  </>
                )}

                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => { setExpanded(false); onDeselectAll(); }}>
                  <X className="w-3 h-3" />{t('bulk.cancel')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[99999]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrashView ? t('bulk.permanentDeleteTitle') : t('bulk.moveToTrashTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrashView
                ? t('bulk.permanentDeleteDesc').replace('{count}', String(selectedCount)).replace('{plural}', selectedCount > 1 ? 'en' : '')
                : t('bulk.moveToTrashDesc').replace('{count}', String(selectedCount)).replace('{plural}', selectedCount > 1 ? 'en' : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('bulk.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleAction(() => onBulkDelete(isTrashView))}
            >
              {isTrashView ? t('bulk.deleteForever') : t('bulk.trash')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
