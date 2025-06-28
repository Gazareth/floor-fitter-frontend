import sum from 'lodash/sum';
import values from 'lodash/values';

export const countConsecutives = (floorboards) => {
    let prev = '';
    const consecs = {};

    floorboards.forEach((fb) => {
        const lg = fb.lengthGroup;
        if (lg === prev) {
            consecs[lg] = (consecs[lg] || 0) + 1;
        }
        prev = lg;
    });

    return consecs;
};

export const totalConsecutives = (floorboards) => {
    return sum(values(countConsecutives(floorboards)));
};
