import { validate } from 'class-validator';
import { CreateNodeDto } from './create-node.dto';

describe('CreateNodeDto', () => {
  it('should validate valid coordinates', async () => {
    const dto = new CreateNodeDto();
    dto.name = 'Test Node';
    dto.address = 'Test Address 123';
    dto.manager_name = 'Test Manager';
    dto.latitude = -31.4201;
    dto.longitude = -64.1888;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate when coordinates are omitted', async () => {
    const dto = new CreateNodeDto();
    dto.name = 'Test Node';
    dto.address = 'Test Address 123';
    dto.manager_name = 'Test Manager';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when latitude is out of bounds', async () => {
    const dto = new CreateNodeDto();
    dto.name = 'Test Node';
    dto.address = 'Test Address 123';
    dto.manager_name = 'Test Manager';
    dto.latitude = -95; // Invalid
    dto.longitude = -64.1888;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('latitude');
  });

  it('should fail validation when longitude is out of bounds', async () => {
    const dto = new CreateNodeDto();
    dto.name = 'Test Node';
    dto.address = 'Test Address 123';
    dto.manager_name = 'Test Manager';
    dto.latitude = -31.4201;
    dto.longitude = 190; // Invalid

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('longitude');
  });
});
