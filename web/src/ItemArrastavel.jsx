import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// O arraste só começa depois de mover 6px: assim um clique normal continua abrindo o item
export function useSensoresArraste() {
    return useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )
}

// Item da lista que pode ser arrastado (usado nos favoritos e nos programas)
export default function ItemArrastavel({ id, className = '', children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    return (
        <li
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
            className={`${className} touch-none ${isDragging ? 'cursor-grabbing opacity-70' : ''}`}
        >
            {children}
        </li>
    )
}