import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Label } from './ui/label'
import queryClient from '@renderer/lib/query-client'
import { invokeIpc } from '@renderer/lib/utils'

function AddPrinter() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [printers, setPrinters] = useState<
    Array<{
      name: string
      description?: string
      isDefault: boolean
    }>
  >([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [selectedType, setSelectedType] = useState<'receipt' | 'a4' | 'label'>('receipt')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPrinter || !selectedType) return

    try {
      await invokeIpc('printers:create', { name: selectedPrinter, type: selectedType })
        .then(() => queryClient.invalidateQueries({ queryKey: ['printers'] }))
        .catch((err) => console.error(err))
      setOpen(false)
    } catch (err) {
      console.error('Error saving printer:', err)
    }
  }

  useEffect(() => {
    const fetchPrinters = async () => {
      setLoading(true)
      try {
        const result = await invokeIpc('printers:list')
        setPrinters(result)
      } catch (error) {
        console.error('Failed to fetch printers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrinters()
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (open && printers.length > 0) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogTrigger asChild>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            {loading ? 'Loading...' : 'Add Printer'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new printer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 w-full">
            <div className="grid gap-3 w-full">
              <Label htmlFor="printer-name">Name</Label>
              <Select onValueChange={setSelectedPrinter}>
                <SelectTrigger id="printer-name" className="w-full">
                  <SelectValue placeholder={loading ? 'Loading...' : 'Select printer'} />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {printers.map((printer) => (
                    <SelectItem key={printer.name} value={printer.name}>
                      {printer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="printer-type">Type</Label>
              <Select
                onValueChange={(value) => setSelectedType(value as 'receipt' | 'a4' | 'label')}
              >
                <SelectTrigger id="printer-type" className="w-full">
                  <SelectValue placeholder={'Select a type'} />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="barcode">Barcode</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="a4">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

export default AddPrinter
