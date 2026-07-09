import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stockBadgeClass',
  standalone: true,
})
export class StockBadgeClassPipe implements PipeTransform {
  transform(stock: number | undefined | null): string {
    const val = stock || 0;
    if (val === 0) {
      return 'bg-red-100 text-red-800';
    }
    if (val < 5) {
      return 'bg-amber-100 text-amber-800';
    }
    return 'bg-emerald-100 text-emerald-800';
  }
}
