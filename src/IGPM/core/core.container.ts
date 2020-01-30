/*
 * Copyright 2018. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'css-core-container',
    template: `<router-outlet></router-outlet>`,
    styles: []
})
export class CoreContainerComponent implements OnInit {

    constructor() { }

    ngOnInit() {
    }

}
