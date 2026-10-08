import React, { useEffect, useRef, useState } from 'react';
import qrImage from '../../maribank-qr-instapay-transparent.png';

/**
 * Donate button — kaparehong itsura ng ibang navbar buttons (Report / Guide),
 * pero lumalabas ang donation modal kapag pinindot:
 *
 *   - MariBank InstaPay QR (public/qr-maribank.png — ilagay ang QR image doon)
 *   - Account details (NINO IAN DAMGO · 1607 0561 909)
 *   - "Copy account number" button (clipboard API + execCommand fallback,
 *     at huling paraan: auto-select ng numero para sa Ctrl+C)
 *   - Step-by-step guide (QR scan / MariBank / GCash)
 *
 * Magsasara ang modal sa Escape o sa pag-click sa labas ng kahon
 * (gaya ng nasa orihinal na standalone HTML).
 */

const ACCOUNT_DISPLAY = '1607 0561 909';
const ACCOUNT_PLAIN = '16070561909';
/** QR image sa project root, bundled via Vite. */
const QR_SRC = qrImage;

const COPY_LABEL_DEFAULT = 'Copy account number';
const COPY_LABEL_OK = 'Copied';
const COPY_LABEL_BLOCKED = 'Copy blocked: number selected, press Ctrl+C';
