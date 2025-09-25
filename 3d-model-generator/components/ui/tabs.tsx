'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-6', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-card text-card-foreground inline-flex h-14 w-fit items-center justify-center rounded-2xl p-2',
        'shadow-lg border-2 border-border/50',
        'backdrop-blur-sm bg-opacity-90',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-4px)] flex-1 select-none items-center justify-center gap-2 rounded-xl px-6 py-2.5",
        "text-base font-semibold transition-all duration-200",
        "cursor-pointer hover:bg-primary/10 hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg",
        "data-[state=active]:scale-[1.02] transform transition-transform duration-200",
        "before:absolute before:inset-0 before:z-[-1] before:rounded-xl before:transition-all before:duration-200",
        "data-[state=active]:before:bg-gradient-to-b data-[state=active]:before:from-primary/80 data-[state=active]:before:to-primary/90",
        "after:absolute after:inset-0 after:z-[-2] after:rounded-xl after:transition-all after:duration-200",
        "data-[state=active]:after:blur-sm data-[state=active]:after:bg-primary/40",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('mt-4 flex-1 outline-none transition-all duration-200', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
