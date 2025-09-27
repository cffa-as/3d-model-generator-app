import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Medal } from "lucide-react";

interface Designer {
  id: string;
  username: string;
  email: string;
  likes: number;
  worksCount: number;
  rank: number;
  avatarText: string;
}

interface DesignerLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  designers: Designer[];
}

export function DesignerLeaderboard({ isOpen, onClose, designers }: DesignerLeaderboardProps) {
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-600";
      default:
        return "text-gray-500";
    }
  };

  const getAvatarColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500";
      case 2:
        return "bg-gray-400";
      case 3:
        return "bg-amber-600";
      default:
        return "bg-primary";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">设计师排行榜</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">排名</TableHead>
                <TableHead className="w-[200px]">设计师</TableHead>
                <TableHead className="w-[200px]">邮箱</TableHead>
                <TableHead className="text-right">获赞数</TableHead>
                <TableHead className="text-right">作品数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {designers.map((designer) => (
                <TableRow key={designer.id}>
                  <TableCell className="font-medium">
                    {designer.rank <= 3 ? (
                      <div className="flex items-center">
                        <Medal className={`h-5 w-5 ${getMedalColor(designer.rank)}`} />
                        <span className="ml-1">{designer.rank}</span>
                      </div>
                    ) : (
                      designer.rank
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`${getAvatarColor(designer.rank)} text-white text-sm font-medium`}>
                          {designer.avatarText}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{designer.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{designer.email}</TableCell>
                  <TableCell className="text-right font-medium">{designer.likes}</TableCell>
                  <TableCell className="text-right font-medium">{designer.worksCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
} 