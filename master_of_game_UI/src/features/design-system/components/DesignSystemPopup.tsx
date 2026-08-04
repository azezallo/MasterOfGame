import React, { useState } from 'react';
import styles from './DesignSystemPopup.module.css';
import type { DesignSystemPopupProps } from '../types';
import type { Message } from '@/components/ui/dialog/types';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/input/Select';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Radio } from '@/components/ui/radio/Radio';
import { Dialogue } from '@/components/ui/dialog/Dialogue';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { Modal } from '@/components/ui/modal/Modal';

export const DesignSystemPopup: React.FC<DesignSystemPopupProps> = ({ isOpen, onClose }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mockMessages: Message[] = [
    { id: '1', type: 'system', content: 'Система ініціалізована.' },
    { id: '2', type: 'ai', content: 'Вітаю, мандрівнику. Я твій провідник у цьому світі.' },
    { id: '3', type: 'player', content: 'Хто ти?', sender: 'Гравцеві' },
    { id: '4', type: 'ai', content: 'Я — дух цього лісу, що запампорядів давні шляхи.' },
  ];

  if (!isOpen) return null;

  return (
    <div className={styles.designSystemOverlay}>
      <div className={styles.designSystemContainer}>
        <div className={styles.designSystemHeader}>
          <h2 className={styles.headerTitle}>Design System Preview</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.designSystemContent}>
          <p>Огляд компонентів дизайн-системи:</p>
          
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--color-gold-dim)', marginBottom: '10px' }}>Buttons</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="danger">Danger Action</Button>
              <Button isLoading>Loading State</Button>
            </div>
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--color-gold-dim)', marginBottom: '10px' }}>Inputs</h3>
            <Input label="Звичайний ввід" placeholder="Введіть текст..." />
            <Input label="Пергаментний ввід" variant="parchment" placeholder="Старий текст..." />
            <div style={{ marginTop: '10px' }}>
              <Select label="Вибір варіанту" options={[
                { value: '1', label: 'Варіант один' },
                { value: '2', label: 'Варіант два' },
                { value: '3', label: 'Варіант три' },
              ]} />
            </div>
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--color-gold-dim)', marginBottom: '10px' }}>Selection</h3>
            <Checkbox label="Варіант з чекбоксом" />
            <Checkbox label="Інший чекбокс" />
            <div style={{ marginTop: '10px' }}>
              <Radio label="Радіо-кнопка один" name="test" />
              <Radio label="Радіо-кнопка два" name="test" />
            </div>
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--color-gold-dim)', marginBottom: '10px' }}>Dialogue System</h3>
            <Dialogue messages={mockMessages} onSendMessage={(content) => console.log(content)} />
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--color-gold-dim)', marginBottom: '10px' }}>Loaders</h3>
            <Spinner />
          </div>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--color-gold-dim)', marginBottom: '10px' }}>Modals</h3>
            <Button onClick={() => setIsModalOpen(true)}>Open Modal Preview</Button>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modal Preview">
              <p>Це приклад модального вікна, яке використовує нашу дизайн-систему.</p>
            </Modal>
          </div>
        </div>
        <div className={styles.designSystemFooter}>
          <button className={styles.closeButton} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
