import type { Component, Project, Wire } from './types';

/** Default sample remains completely editable, rather than a baked image. */
export class DemoProject {
  public create(): Project {
    const sonar: Component = { id: 'sonar', name: 'SONAR', detail: '8-pin connector', x: 80, y: 150, width: 270, pins: [
      ['1','RxB'],['2','TxA'],['3','+V'],['4','GND'],['5','TxB'],['6','RxA'],['7','0V'],['8','Reserved']
    ].map(([number,label]) => ({ id: 's' + number, number: number ?? '', label: label ?? '', side: 'right' })) };
    const moxa: Component = { id: 'moxa', name: 'MOXA UPort 1130', detail: 'RS-422 4-wire', x: 1020, y: 120, width: 260, pins: [
      ['1','T+'],['2','T-'],['3','R+'],['4','R-'],['5','GND']
    ].map(([number,label]) => ({ id: 'm' + number, number: number ?? '', label: label ?? '', side: 'left' })) };
    const psu: Component = { id: 'psu', name: 'PSU', detail: 'External power supply', x: 1020, y: 480, width: 260, pins: [
      { id: 'p1', number: '1', label: '+V', side: 'left' }, { id: 'p2', number: '2', label: '0V', side: 'left' }
    ] };
    const connections: Array<[string,string,string,string]> = [
      ['s1','m1','#3478d4','solid'], ['s2','m4','#d8504b','dash'],
      ['s3','p1','#d98925','solid'], ['s4','m5','#3b3b3b','dashdot'],
      ['s5','m3','#23966b','dot'], ['s6','m2','#8e62c1','solid'],
      ['s7','p2','#768392','dash']
    ];
    const wires: Wire[] = connections.map(([from,to,color,dash], index) => ({
      id: 'wire' + index, from: from ?? '', to: to ?? '', points: [], color: color ?? '#333333',
      dash: (dash ?? 'solid') as Wire['dash'], width: 2.5, label: ''
    }));
    return { version: 1, name: 'SONAR / MOXA / PSU', width: 1370, height: 850, components: [sonar,moxa,psu], anchors: [], symbols: [],
      wires, annotations: [], shapes: [], background: null };
  }
}
