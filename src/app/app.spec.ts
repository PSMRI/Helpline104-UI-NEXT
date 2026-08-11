/*
 * AMRIT – Accessible Medical Records via Integrated Technologies
 * Integrated EHR (Electronic Health Records) Solution
 *
 * Copyright (C) "Piramal Swasthya Management and Research Institute"
 *
 * This file is part of AMRIT.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/.
 */

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

/**
 * The root shell renders no content of its own: a `<router-outlet />` for the
 * routed view plus the two root-level siblings that must outlive it — the CTI
 * panel (the CZentrix softphone iframe, which has to survive every navigation or
 * the live call drops) and the toaster.
 *
 * These specs previously asserted the Angular starter's `<h1>Hello, …</h1>`, which
 * the shell has never rendered in this app, so the suite carried a permanent
 * failure. They now pin what the shell actually guarantees.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the outlet the routed views are projected into', () => {
    expect(render().querySelector('router-outlet')).not.toBeNull();
  });

  it('renders the CTI panel outside the outlet so the softphone survives navigation', () => {
    const compiled = render();
    const panel = compiled.querySelector('app-cti-panel');

    expect(panel).not.toBeNull();
    // A sibling of the outlet, not a descendant — nesting it inside would tear the
    // iframe down on every route change and drop the connected call.
    expect(panel?.closest('router-outlet')).toBeNull();
  });

  it('renders the toaster', () => {
    expect(render().querySelector('z-toaster')).not.toBeNull();
  });
});
